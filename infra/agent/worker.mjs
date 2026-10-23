import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  OpenShellCodex,
  sandboxName,
} from "../../app/adapters/agent-openshell.mjs";
import { responseText } from "../../app/core/agent-response.mjs";
import { resolveAgentResponse } from "../../app/services/agent-response.mjs";

const workerId = randomUUID();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});
const runtime = new OpenShellCodex();
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
      ready ? "OpenShell connected" : "Agent runtime needs attention",
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
        .map((block) => ({ type: block.type, entryId: block.entry.id })),
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
    const name = sandboxName(turn.id);
    await client.query(
      `UPDATE agent_turns SET status='running',progress='Starting agent',
      worker_id=$2,sandbox_name=$3,context_snapshot=$4,heartbeat_at=now(),started_at=now(),updated_at=now()
      WHERE id=$1`,
      [turn.id, workerId, name, JSON.stringify(snapshot)],
    );
    await client.query("COMMIT");
    return { ...turn, sandbox_name: name, context_snapshot: snapshot };
  } catch (error) {
    await client.query("ROLLBACK");
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
      await runtime.remove(turn.sandbox_name);
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
    const output = await runtime.run({
      name: turn.sandbox_name,
      prompt: JSON.stringify({
        experiment: turn.context_snapshot,
        message: turn.prompt,
      }),
      signal: controller.signal,
      progress: (value) => {
        progress = value;
      },
    });
    document = await resolveAgentResponse(pool, {
      response: output,
      projectId: turn.project_id,
      ownerId: turn.owner_id,
      availableCards: turn.context_snapshot.availableCards,
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
