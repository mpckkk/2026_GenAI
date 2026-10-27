// Real saved annotation, source matrices and optional live Nightshift job only.
// Run: node --env-file=.env scripts/verify-investigation.mjs RUN_ID CLUSTER [--provider]
// CELLORAS_DATASET_DIR must point to the verified public dataset catalog.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { LocalScientificData } from "../app/adapters/scientific-data.mjs";
import { configuredReferences } from "../app/adapters/zetaris-reference.mjs";
import {
  prepareInvestigation,
  runInvestigation,
} from "../app/services/investigation.mjs";
import { NightshiftInvestigation } from "../app/gateway/nightshift-investigation.mjs";
import { activityFor } from "../infra/agent/activity.mjs";

const [runId, clusterId, mode] = process.argv.slice(2);
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
if (
  !uuid.test(runId ?? "") ||
  !/^[A-Za-z0-9_.-]{1,64}$/.test(clusterId ?? "") ||
  (mode && !["--provider", "--failure"].includes(mode))
)
  throw new Error(
    "Supply a real saved annotation UUID and group, optionally --provider or --failure.",
  );
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const scientific = new LocalScientificData();
const provider = new NightshiftInvestigation();
try {
  const {
    rows: [source],
  } = await db.query(
    `SELECT a.* FROM analysis_runs a JOIN agent_turns t ON t.id=a.turn_id
    JOIN project_datasets d ON d.project_id=a.project_id WHERE a.id=$1 AND a.operation='annotation'
    AND t.status='completed' AND NOT t.cancel_requested AND d.dataset_id=a.dataset_id AND d.artifact_version=a.artifact_version`,
    [runId],
  );
  assert(
    source,
    "A completed annotation on the currently attached dataset is required.",
  );
  const before = JSON.stringify(source.result);
  const packet = await prepareInvestigation({ source, clusterId, scientific });

  // Independently read the original sparse count files, bypassing the expression adapter.
  const directory = path.join(
    process.env.CELLORAS_DATASET_DIR,
    source.dataset_id,
  );
  const readJson = async (name) =>
    JSON.parse(await readFile(path.join(directory, name), "utf8"));
  const genes = await readJson("rna-counts/genes.json");
  const { points: embedding } = await readJson("embedding.json");
  const pointers = await readFile(
    path.join(directory, "rna-counts/gene-pointers.bin"),
  );
  const indices = await readFile(
    path.join(directory, "rna-counts/cell-indices.bin"),
  );
  const values = await readFile(path.join(directory, "rna-counts/values.bin"));
  const selectedCells = new Set(
    embedding.filter((c) => c.cluster === clusterId).map((c) => c.cellId),
  );
  const detected = packet.candidates.map((candidate) => {
    const union = new Set();
    for (const gene of candidate.selectedGenes) {
      const index = genes.findIndex((g) => g.geneId === gene);
      assert(index >= 0);
      let count = 0;
      for (
        let pos = pointers.readUInt32LE(index * 4);
        pos < pointers.readUInt32LE((index + 1) * 4);
        pos++
      ) {
        const cell = embedding[indices.readUInt32LE(pos * 4)].cellId;
        if (selectedCells.has(cell) && values.readDoubleLE(pos * 8) > 0) {
          union.add(cell);
          count++;
        }
      }
      assert.equal(
        packet.check.perGene.find((g) => g.geneId === gene).detected,
        count,
      );
    }
    return union;
  });
  const both = [...detected[0]].filter((cell) => detected[1].has(cell)).length;
  assert.equal(packet.check.both, both);
  assert.equal(packet.check.firstOnly, detected[0].size - both);
  assert.equal(packet.check.secondOnly, detected[1].size - both);
  assert.equal(
    packet.check.neither,
    selectedCells.size - new Set([...detected[0], ...detected[1]]).size,
  );
  assert.equal(packet.check.total, selectedCells.size);
  console.log(
    JSON.stringify({
      event: "investigation.measurements.verified",
      sourceRunId: runId,
      cluster: clusterId,
      check: packet.check,
    }),
  );

  const oldFlag = process.env.CELLORAS_INVESTIGATION_ENABLED;
  process.env.CELLORAS_INVESTIGATION_ENABLED = "true";
  try {
    await assert.rejects(
      () =>
        runInvestigation({
          connection: db,
          scientific,
          referenceProvider: configuredReferences(),
          provider,
          projectId: source.project_id,
          ownerId: randomUUID(),
          turnId: randomUUID(),
          action: {
            datasetId: source.dataset_id,
            annotationRunId: runId,
            cluster: clusterId,
          },
        }),
      { code: "investigation_source_unavailable" },
    );
  } finally {
    if (oldFlag === undefined)
      delete process.env.CELLORAS_INVESTIGATION_ENABLED;
    else process.env.CELLORAS_INVESTIGATION_ENABLED = oldFlag;
  }
  console.log(JSON.stringify({ event: "investigation.cross_owner.denied" }));

  if (mode === "--failure") {
    // Real provider rejection and real DB/activity writes, isolated by rollback.
    // Use only with a runtime known to have no ready model lanes.
    const connection = await db.connect();
    await connection.query("BEGIN");
    try {
      const {
        rows: [turn],
      } = await connection.query(
        `INSERT INTO agent_turns(project_id,owner_id,submission_id,prompt,status,activity_version)
        VALUES($1,$2,$3,'Real investigation provider acceptance check','running',1) RETURNING *`,
        [source.project_id, source.owner_id, randomUUID()],
      );
      await assert.rejects(
        () =>
          runInvestigation({
            connection,
            scientific,
            referenceProvider: configuredReferences(),
            provider,
            activity: activityFor(connection, turn),
            progress: () => {},
            projectId: source.project_id,
            ownerId: source.owner_id,
            turnId: turn.id,
            action: {
              datasetId: source.dataset_id,
              annotationRunId: runId,
              cluster: clusterId,
            },
          }),
        { code: "nightshift_no_ready_lane" },
      );
      const {
        rows: [job],
      } = await connection.query(
        "SELECT state,error_code,provider_job_id,evidence_sha256 FROM investigation_jobs WHERE turn_id=$1",
        [turn.id],
      );
      assert.equal(job.state, "failed");
      assert.equal(job.error_code, "nightshift_no_ready_lane");
      assert(job.provider_job_id);
      const { rows: events } = await connection.query(
        "SELECT kind,phase,data FROM agent_activity_events WHERE turn_id=$1 ORDER BY position",
        [turn.id],
      );
      assert(
        events.some((e) => e.kind === "reference" && e.phase === "completed"),
      );
      assert(
        events.some(
          (e) => e.data.operation === "co_detection" && e.phase === "completed",
        ),
      );
      assert(
        events.some(
          (e) =>
            e.data.provider === "Meterless Nightshift" &&
            e.phase === "failed" &&
            e.data.providerJobId === job.provider_job_id,
        ),
      );
      assert.equal(
        (
          await connection.query(
            "SELECT count(*)::int AS n FROM analysis_runs WHERE turn_id=$1",
            [turn.id],
          )
        ).rows[0].n,
        0,
      );
      const receipt = {
        event: "investigation.real_failure_verified",
        job,
        events: events.map((e) => ({
          kind: e.kind,
          phase: e.phase,
          operation: e.data.operation,
          provider: e.data.provider,
          providerJobId: e.data.providerJobId,
        })),
        resultCreated: false,
      };
      await mkdir(".artifacts/investigation", { recursive: true, mode: 0o700 });
      await writeFile(
        ".artifacts/investigation/failure-acceptance.json",
        JSON.stringify(receipt, null, 2),
        { mode: 0o600 },
      );
      console.log(JSON.stringify(receipt));
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
    }
  }

  if (mode === "--provider") {
    const directory = path.join(process.cwd(), ".artifacts/investigation");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const receipt = {
      sourceRunId: runId,
      cluster: clusterId,
      startedAt: new Date().toISOString(),
    };
    const file = path.join(directory, `provider-${randomUUID()}.json`);
    try {
      const result = await provider.run({
        packet,
        progress: (message) =>
          console.log(
            JSON.stringify({
              event: "investigation.provider.progress",
              message,
            }),
          ),
        onSubmitted: async (jobId) => {
          receipt.jobId = jobId;
          await writeFile(file, JSON.stringify(receipt), { mode: 0o600 });
        },
      });
      await writeFile(file, JSON.stringify({ ...receipt, result }), {
        mode: 0o600,
      });
      console.log(
        JSON.stringify({
          event: "investigation.provider.verified",
          jobId: result.jobId,
          attempts: result.attempts.length,
          selectedAttempt: result.selectedAttempt,
        }),
      );
    } catch (error) {
      const code = /^[a-z_]{1,100}$/.test(error.code ?? "")
        ? error.code
        : "provider_failure";
      await writeFile(file, JSON.stringify({ ...receipt, error: code }), {
        mode: 0o600,
      });
      throw error;
    }
  }
  const {
    rows: [after],
  } = await db.query("SELECT result FROM analysis_runs WHERE id=$1", [runId]);
  assert.equal(JSON.stringify(after.result), before);
  console.log(JSON.stringify({ event: "investigation.original.unchanged" }));
} catch (error) {
  console.error(
    JSON.stringify({
      event: "investigation.verification.failed",
      code: /^[a-z_]{1,100}$/.test(error.code ?? "")
        ? error.code
        : "verification_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
