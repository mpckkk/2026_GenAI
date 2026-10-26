import { LocalScientificData } from "../../app/adapters/scientific-data.mjs";
import { ProjectScientificData } from "../../app/adapters/project-scientific-data.mjs";
import { MarkerAnnotationEngine } from "../../app/adapters/annotation-engine.mjs";
import { CuratedLiterature } from "../../app/adapters/literature.mjs";
import { runAnalysis } from "../../app/services/analysis-tools.mjs";
import { analysisRun, analysisCardType } from "../../app/core/analysis.mjs";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  OpenShellCodex,
  sandboxName,
} from "../../app/adapters/agent-openshell.mjs";
import { configuredReferences } from "../../app/adapters/zetaris-reference.mjs";
import { runMarkerEvidence } from "../../app/services/marker-evidence.mjs";
import {
  responseText,
  AgentResponseError,
} from "../../app/core/agent-response.mjs";
import { resolveAgentResponse } from "../../app/services/agent-response.mjs";
import { ResearchMemory } from "../../app/adapters/research-memory.mjs";
import { NightshiftAgent } from "../../app/gateway/nightshift.mjs";

const workerId = randomUUID();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});
const runtimeName = process.env.CELLORAS_AGENT_RUNTIME || "openshell";
if (!["openshell", "nightshift"].includes(runtimeName))
  throw new Error("agent_runtime_invalid");
const runtime =
  runtimeName === "openshell" ? new OpenShellCodex() : new NightshiftAgent();
const references = configuredReferences();
const markerReference = references.marker;
const scientific = new LocalScientificData();
const projectScientific = new ProjectScientificData({
  database: pool,
  publicData: scientific,
});
const literature = new CuratedLiterature();
const annotation = new MarkerAnnotationEngine({
  scientificData: scientific,
  loadReference: references.load,
});
const memory = new ResearchMemory();
let stopping = false,
  activeController;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (event, extra = {}) =>
  console.log(JSON.stringify({ event, workerId, ...extra }));
pool.on("error", () => {
  log("database.connection.failed");
  activeController?.abort();
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    stopping = true;
    activeController?.abort();
  });

async function health() {
  let ready = false;
  try {
    await runtime.health();
    await memory.health(pool);
    ready = true;
  } catch {
    /* fail closed */
  }
  await pool.query(
    `INSERT INTO agent_workers(worker_id,status,detail,heartbeat_at)
    VALUES ($1,$2,$3,now()) ON CONFLICT(worker_id) DO UPDATE
    SET status=excluded.status,detail=excluded.detail,heartbeat_at=now()`,
    [
      workerId,
      ready ? "ready" : "unavailable",
      ready
        ? `${runtimeName === "openshell" ? "OpenShell" : "Meterless Nightshift"} connected${runtime.lastReceipt?.returnedModel ? ` · ${runtime.lastReceipt.returnedModel}` : ""}`
        : `${runtimeName} runtime needs attention`,
    ],
  );
  return ready;
}

function boundedContext(previous, research) {
  let chars = 0;
  const conversation = [];
  for (const row of previous) {
    const turn = {
      user: row.prompt,
      assistant: row.response_text,
      cards: row.response_document?.blocks
        .filter((block) => block.type !== "markdown")
        .map((block) => ({
          type: block.type,
          entryId: block.result ? block.result.id : block.entry.id,
        })),
    };
    const size = JSON.stringify(turn).length;
    if (chars + size > 90000) break;
    chars += size;
    conversation.unshift(turn);
  }
  chars = 0;
  const records = [];
  for (const row of research) {
    const record = {
      entryId: row.id,
      kind: row.kind,
      payload: row.payload,
      createdAt: row.created_at,
    };
    const size = JSON.stringify(record).length;
    if (chars + size > 50000) continue;
    chars += size;
    records.unshift(record);
  }
  return {
    conversation,
    records,
    contextNote:
      "Only recent conversation and bounded research records are included. Missing information is unknown; ask the researcher when needed.",
  };
}

async function claim() {
  const client = await pool.connect();
  let claimedId;
  try {
    await client.query("BEGIN");
    const result = await client.query(`SELECT t.* FROM agent_turns t
      JOIN projects p ON p.id=t.project_id AND p.owner_id=t.owner_id
      WHERE t.status='queued' AND NOT t.cancel_requested
      AND NOT EXISTS (SELECT 1 FROM agent_turns old WHERE old.project_id=t.project_id
        AND old.status IN ('completed','failed','cancelled') AND old.sandbox_name IS NOT NULL)
      ORDER BY t.position
      LIMIT 1 FOR UPDATE OF t SKIP LOCKED`);
    const turn = result.rows[0];
    if (!turn) {
      await client.query("COMMIT");
      return null;
    }
    claimedId = turn.id;
    const previous = await client.query(
      `SELECT prompt,response_text,response_document FROM agent_turns
      WHERE project_id=$1 AND owner_id=$2 AND status='completed' AND position < $3
      ORDER BY position DESC LIMIT 24`,
      [turn.project_id, turn.owner_id, turn.position],
    );
    const research = await client.query(
      `SELECT id,kind,payload,created_at FROM research_entries
      WHERE project_id=$1 AND author_id=$2 ORDER BY position DESC LIMIT 30`,
      [turn.project_id, turn.owner_id],
    );
    // An explicit imported group can be older than the recent-record window.
    // Resolve only bounded exact handles within this owned experiment.
    const markerHandles = [
      ...turn.prompt.matchAll(/marker-set:([a-f0-9-]{36})\b/gi),
    ]
      .map((match) => match[1].toLowerCase())
      .filter((id) => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))
      .slice(0, 2);
    if (markerHandles.length) {
      const requested = await client.query(
        `SELECT r.id,r.kind,r.payload,r.created_at FROM research_entries r
         JOIN projects p ON p.id=r.project_id AND p.owner_id=$2
         WHERE r.project_id=$1 AND r.author_id=$2 AND r.kind='markers' AND r.id=ANY($3::uuid[])`,
        [turn.project_id, turn.owner_id, markerHandles],
      );
      research.rows = [
        ...requested.rows,
        ...research.rows.filter(
          (row) => !requested.rows.some((selected) => selected.id === row.id),
        ),
      ];
    }
    const snapshot = boundedContext(previous.rows, research.rows);
    const sample = await client.query(
      `SELECT r.id,r.payload,r.created_at FROM research_entries r
      JOIN projects p ON p.id=r.project_id AND p.owner_id=$2
      WHERE r.project_id=$1 AND r.author_id=$2 AND r.kind='context'
      ORDER BY r.position DESC LIMIT 1`,
      [turn.project_id, turn.owner_id],
    );
    snapshot.sampleContext = sample.rows[0]
      ? {
          entryId: sample.rows[0].id,
          ...sample.rows[0].payload.context,
          createdAt: sample.rows[0].created_at,
        }
      : null;
    snapshot.availableCards = snapshot.records
      .filter((record) => ["context", "markers"].includes(record.kind))
      .map((record) => ({
        type: record.kind === "context" ? "sample_context" : "marker_set",
        entryId: record.entryId,
      }));
    if (
      snapshot.sampleContext &&
      !snapshot.availableCards.some(
        (card) => card.entryId === snapshot.sampleContext.entryId,
      )
    ) {
      snapshot.availableCards.push({
        type: "sample_context",
        entryId: snapshot.sampleContext.entryId,
      });
    }
    const recentEvidence = await client.query(
      `SELECT e.id,e.project_id,e.turn_id,e.result,e.created_at FROM marker_evidence_runs e
       JOIN agent_turns t ON t.id=e.turn_id JOIN projects p ON p.id=e.project_id
       WHERE e.project_id=$1 AND e.owner_id=$2 AND p.owner_id=$2 AND t.status='completed'
       ORDER BY e.created_at DESC LIMIT 3`,
      [turn.project_id, turn.owner_id],
    );
    snapshot.evidenceResults = recentEvidence.rows.map((row) => ({
      ...row.result,
      id: row.id,
      projectId: row.project_id,
      turnId: row.turn_id,
      createdAt: row.created_at.toISOString(),
    }));
    snapshot.availableCards.push(
      ...snapshot.evidenceResults.map((result) => ({
        type: "marker_evidence",
        entryId: result.id,
      })),
    );
    snapshot.evidenceReference = (await markerReference.health()).source;
    const binding = await client.query(
      "SELECT dataset_id,artifact_version FROM project_datasets WHERE project_id=$1",
      [turn.project_id],
    );
    snapshot.dataset = null;
    snapshot.scientificStatus = "not_attached";
    if (binding.rows[0]) {
      try {
        snapshot.dataset =
          (
            await projectScientific
              .forProject(turn.owner_id, turn.project_id)
              .catalog()
          ).find(
            (d) =>
              d.id === binding.rows[0].dataset_id &&
              d.artifactVersion === binding.rows[0].artifact_version,
          ) || null;
        snapshot.scientificStatus = snapshot.dataset ? "ready" : "unavailable";
      } catch {
        snapshot.scientificStatus = "unavailable";
      }
    }
    try {
      snapshot.literature = await literature.health();
    } catch {
      snapshot.literature = { status: "unavailable" };
    }
    // A card can be older than the four latest plots. Resolve only bounded,
    // explicitly referenced owned annotation runs; a prompt never grants access.
    const referencedRuns = [
      ...turn.prompt.matchAll(
        /Saved annotation run:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
      ),
    ]
      .slice(0, 2)
      .map((match) => match[1].toLowerCase());
    const analyses = await client.query(
      `WITH owned AS (
        SELECT a.id,a.project_id,a.turn_id,a.dataset_id,a.created_at,a.result-'payload' AS result,a.operation
        FROM analysis_runs a JOIN agent_turns t ON t.id=a.turn_id JOIN projects p ON p.id=a.project_id
        WHERE a.project_id=$1 AND a.owner_id=$2 AND p.owner_id=$2 AND t.project_id=$1 AND t.owner_id=$2
          AND t.status='completed' AND NOT t.cancel_requested
      ) SELECT * FROM owned WHERE id IN (
        (SELECT id FROM owned ORDER BY created_at DESC LIMIT 4)
        UNION (SELECT id FROM owned WHERE operation='annotation' ORDER BY created_at DESC LIMIT 1)
        UNION (SELECT id FROM owned WHERE operation='annotation' AND id=ANY($3::uuid[]))
      ) ORDER BY created_at DESC`,
      [turn.project_id, turn.owner_id, referencedRuns],
    );
    snapshot.analysisResults = analyses.rows.map((row) => analysisRun(row));
    snapshot.availableCards.push(
      ...analyses.rows.map((row) => ({
        type: analysisCardType(row.operation),
        entryId: row.id,
      })),
    );
    const reviews = await client.query(
      "SELECT run_id,decision,note,cluster,created_at FROM analysis_reviews WHERE project_id=$1 AND owner_id=$2 ORDER BY created_at DESC LIMIT 6",
      [turn.project_id, turn.owner_id],
    );
    snapshot.researcherReviews = reviews.rows;
    const annotationReviews = await client.query(
      `SELECT * FROM (
         SELECT DISTINCT ON(run_id,cluster) run_id,cluster,decision,cell_type,left(note,500) AS note,length(note)>500 AS note_truncated,created_at
         FROM annotation_reviews WHERE project_id=$1 AND owner_id=$2 AND run_id=ANY($3::uuid[])
         ORDER BY run_id,cluster,created_at DESC,id DESC
       ) latest ORDER BY created_at DESC LIMIT 48`,
      [
        turn.project_id,
        turn.owner_id,
        analyses.rows
          .filter((row) => row.operation === "annotation")
          .map((row) => row.id),
      ],
    );
    snapshot.annotationReviews = annotationReviews.rows;
    try {
      snapshot.annotation = await annotation.health();
    } catch {
      snapshot.annotation = { status: "unavailable" };
    }

    const name = runtimeName === "openshell" ? sandboxName(turn.id) : null;
    snapshot.agentRuntime = runtimeName;
    snapshot.researchMemory = await memory.recall(client, {
      ownerId: turn.owner_id,
      projectId: turn.project_id,
      turnId: turn.id,
      query: turn.prompt,
    });
    await client.query(
      `UPDATE agent_turns SET status='running',progress='Starting agent',
      worker_id=$2,sandbox_name=$3,context_snapshot=$4,heartbeat_at=now(),started_at=now(),updated_at=now()
      WHERE id=$1`,
      [turn.id, workerId, name, JSON.stringify(snapshot)],
    );
    await client.query("COMMIT");
    log("memory.recalled", {
      turnId: turn.id,
      count: snapshot.researchMemory.decisions.length,
    });
    return { ...turn, sandbox_name: name, context_snapshot: snapshot };
  } catch (error) {
    await client.query("ROLLBACK");
    if (
      claimedId &&
      typeof error.code === "string" &&
      /^(memory_|zetaris_|reference_provider_)/.test(error.code)
    ) {
      await client.query(
        "UPDATE agent_turns SET status='failed',error_code=$2,progress='Research service needs attention',finished_at=now(),updated_at=now() WHERE id=$1 AND status='queued'",
        [claimedId, error.code],
      );
    }
    throw error;
  } finally {
    client.release();
  }
}

async function recover() {
  // Never repeat an interrupted model call: the outcome may be unknown.
  await pool.query(`UPDATE agent_turns SET status='failed',error_code='worker_interrupted',
    progress='Agent was interrupted',finished_at=now(),updated_at=now()
    WHERE status='running' AND heartbeat_at < now()-interval '60 seconds'`);
  const cleanup = await pool.query(`SELECT id,sandbox_name FROM agent_turns
    WHERE status IN ('completed','failed','cancelled') AND sandbox_name IS NOT NULL ORDER BY updated_at LIMIT 1`);
  for (const turn of cleanup.rows) {
    if (turn.sandbox_name !== sandboxName(turn.id)) continue;
    try {
      // Historical sandbox leases always belong to OpenShell, even after switching runtime.
      await (
        runtimeName === "openshell" ? runtime : new OpenShellCodex()
      ).remove(turn.sandbox_name);
      await pool.query(
        "UPDATE agent_turns SET sandbox_name=NULL WHERE id=$1 AND status IN ('completed','failed','cancelled')",
        [turn.id],
      );
    } catch {
      log("sandbox.cleanup.failed", { turnId: turn.id });
      await pool.query("UPDATE agent_turns SET updated_at=now() WHERE id=$1", [
        turn.id,
      ]);
    }
  }
  await pool.query(
    `DELETE FROM agent_workers WHERE heartbeat_at < now()-interval '1 day'`,
  );
}

async function execute(turn) {
  const controller = new AbortController();
  activeController = controller;
  let progress = "Starting agent",
    pulseBusy = false;
  const pulse = async () => {
    if (pulseBusy) return;
    pulseBusy = true;
    try {
      const result = await pool.query(
        `UPDATE agent_turns SET heartbeat_at=now(),updated_at=now(),progress=$3
        WHERE id=$1 AND worker_id=$2 AND status='running' RETURNING cancel_requested`,
        [turn.id, workerId, progress],
      );
      if (!result.rows.length || result.rows[0].cancel_requested)
        controller.abort();
      await health();
    } catch {
      controller.abort();
      log("turn.heartbeat.failed", { turnId: turn.id });
    } finally {
      pulseBusy = false;
    }
  };
  const timer = setInterval(pulse, 3000);
  let response = null,
    document = null,
    code = null;
  log("turn.started", { turnId: turn.id });
  try {
    const run = async (experiment, message) => {
      const output = await runtime.run({
        name: turn.sandbox_name,
        prompt: JSON.stringify({ experiment, message }),
        signal: controller.signal,
        progress: (value) => {
          progress = value;
        },
      });
      if (runtime.lastReceipt) {
        experiment.inferenceReceipts ??= [];
        experiment.inferenceReceipts.push(runtime.lastReceipt);
        await pool.query(
          "UPDATE agent_turns SET context_snapshot=$3 WHERE id=$1 AND worker_id=$2 AND status='running'",
          [turn.id, workerId, JSON.stringify(experiment)],
        );
      }
      return output;
    };
    const snapshot = turn.context_snapshot;
    const scopedScientific = projectScientific.forProject(
      turn.owner_id,
      turn.project_id,
    );
    const scopedAnnotation = new MarkerAnnotationEngine({
      scientificData: scopedScientific,
      loadReference: references.load,
    });
    const completedCards = [];
    let steps = 0,
      lookedUp = false;
    const invoke = async (action) => {
      if (steps >= 4) throw new AgentResponseError("agent_tool_limit");
      progress =
        action.operation === "literature"
          ? "Finding cited evidence"
          : `Computing ${action.operation}`;
      log("tool.started", { turnId: turn.id, tool: action.operation });
      const result = await runAnalysis(
        pool,
        scopedScientific,
        literature,
        scopedAnnotation,
        {
          projectId: turn.project_id,
          ownerId: turn.owner_id,
          turnId: turn.id,
          action,
          step: steps++,
          signal: controller.signal,
        },
      );
      const card = {
        type: analysisCardType(action.operation),
        entryId: result.id,
      };
      snapshot.analysisResults.push(result);
      snapshot.availableCards.push(card);
      completedCards.push(card);
      log("tool.completed", {
        turnId: turn.id,
        tool: action.operation,
        resultId: result.id,
      });
    };
    if (turn.requested_action) await invoke(turn.requested_action);
    let output;
    for (;;) {
      snapshot.remainingToolCalls = 4 - steps;
      await pool.query(
        `UPDATE agent_turns SET context_snapshot=$3,progress='Explaining results',updated_at=now() WHERE id=$1 AND worker_id=$2 AND status='running'`,
        [turn.id, workerId, JSON.stringify(snapshot)],
      );
      if (controller.signal.aborted) throw new AgentResponseError("cancelled");
      output = await run(snapshot, turn.prompt);
      const lookup = output.blocks.find(
        (b) => b.type === "lookup_marker_evidence",
      );
      const analysis = output.blocks.find(
        (b) => b.type === "run_scientific_tool",
      );
      if (!lookup && !analysis) break;
      if (steps >= 4) throw new AgentResponseError("agent_tool_limit");
      if (analysis) {
        await invoke({
          datasetId: analysis.datasetId,
          operation: analysis.operation,
          ...(analysis.cluster === null ? {} : { cluster: analysis.cluster }),
          genes: analysis.genes,
          ...(analysis.query === null ? {} : { query: analysis.query }),
        });
      } else {
        if (lookedUp) throw new AgentResponseError("agent_tool_limit");
        lookedUp = true;
        steps++;
        progress = "Looking up published marker evidence";
        log("tool.started", {
          turnId: turn.id,
          tool: "lookup_marker_evidence",
        });
        const evidence = await runMarkerEvidence(pool, markerReference, {
          projectId: turn.project_id,
          ownerId: turn.owner_id,
          turnId: turn.id,
          markerEntryId: lookup.entryId,
          availableCards: snapshot.availableCards,
          signal: controller.signal,
        });
        snapshot.evidenceResults = [evidence];
        const card = { type: "marker_evidence", entryId: evidence.id };
        snapshot.availableCards.push(card);
        completedCards.push(card);
        snapshot.completedLookup = {
          markerEntryId: lookup.entryId,
          evidenceId: evidence.id,
        };
        log("tool.completed", {
          turnId: turn.id,
          tool: "lookup_marker_evidence",
          evidenceId: evidence.id,
          status: evidence.status,
          candidates: evidence.candidates.length,
        });
      }
    }
    // Every executed tool stays inspectable even if the model forgets its card.
    for (const card of completedCards) {
      if (
        !output.blocks.some(
          (b) => b.type === card.type && b.entryId === card.entryId,
        )
      ) {
        if (output.blocks.length >= 12) throw new AgentResponseError();
        output.blocks.push(card);
      }
    }
    document = await resolveAgentResponse(pool, {
      response: output,
      projectId: turn.project_id,
      ownerId: turn.owner_id,
      availableCards: snapshot.availableCards,
    });
    response = responseText(document);
  } catch (error) {
    code =
      error.code === "sandbox_cleanup_failed"
        ? error.code
        : stopping
          ? "worker_interrupted"
          : error.code || "agent_execution_failed";
  } finally {
    clearInterval(timer);
    activeController = undefined;
  }
  const result = await pool.query(
    `UPDATE agent_turns SET
    status=CASE WHEN cancel_requested THEN 'cancelled' WHEN $3::text IS NULL THEN 'completed' ELSE 'failed' END,
    response_text=CASE WHEN cancel_requested OR $3::text IS NOT NULL THEN NULL ELSE $4 END,
    response_document=CASE WHEN cancel_requested OR $3::text IS NOT NULL THEN NULL ELSE $5::jsonb END,
    error_code=CASE WHEN cancel_requested THEN NULL ELSE $3 END,
    sandbox_name=CASE WHEN $3::text='sandbox_cleanup_failed' THEN sandbox_name ELSE NULL END,
    progress=CASE WHEN cancel_requested THEN 'Cancelled' WHEN $3::text IS NULL THEN 'Complete' ELSE 'Agent stopped' END,
    finished_at=now(),updated_at=now(),heartbeat_at=now()
    WHERE id=$1 AND worker_id=$2 AND status='running' RETURNING status`,
    [
      turn.id,
      workerId,
      code,
      response,
      document ? JSON.stringify(document) : null,
    ],
  );
  log("turn.finished", {
    turnId: turn.id,
    status: result.rows[0]?.status || "lease_lost",
    code,
  });
}

try {
  log("worker.started");
  while (!stopping) {
    try {
      await recover();
      if (await health()) {
        const turn = await claim();
        if (turn) {
          await execute(turn);
          continue;
        }
      }
    } catch {
      log("worker.cycle.failed");
    }
    await sleep(2000);
  }
} finally {
  await pool
    .query(
      `UPDATE agent_workers SET status='unavailable',detail='Worker stopped',heartbeat_at=now()
    WHERE worker_id=$1`,
      [workerId],
    )
    .catch(() => {});
  await pool.end();
}
