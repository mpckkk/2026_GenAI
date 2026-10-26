const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const IDENTIFIER = /^[A-Za-z0-9_.:-]{1,100}$/;
const KINDS = new Set([
  "queue",
  "context",
  "memory",
  "model",
  "tool",
  "reference",
  "response",
  "cleanup",
]);
const PHASES = new Set(["started", "completed", "failed", "cancelled", "info"]);
const FIELDS = new Set([
  "provider",
  "datasetId",
  "artifactVersion",
  "operation",
  "cluster",
  "genes",
  "resultId",
  "reference",
  "runtime",
  "model",
  "inputBytes",
  "contextCounts",
  "outputCounts",
  "sourceIds",
  "memoryCount",
  "errorCode",
  "decision",
  "durationMs",
]);
const isObject = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype ||
    Object.getPrototypeOf(v) === null);
const text = (v, n) =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= n &&
  !/[\u0000-\u001f\u007f]/u.test(v);
const count = (v) => Number.isSafeInteger(v) && v >= 0;

export class ActivityWriteError extends Error {
  constructor(code) {
    super(code);
    this.name = "ActivityWriteError";
    this.code = code;
  }
}
function invalid() {
  throw new ActivityWriteError("activity_invalid_event");
}
function counts(v, keys) {
  if (
    !isObject(v) ||
    Object.entries(v).some(
      ([key, value]) => !keys.includes(key) || !count(value),
    )
  )
    invalid();
}
/** Strict metadata-only projection. New fields require an intentional schema change. */
export function validateActivityData(value = {}) {
  if (!isObject(value) || Object.keys(value).some((key) => !FIELDS.has(key)))
    invalid();
  for (const [key, v] of Object.entries(value)) {
    if (["inputBytes", "memoryCount", "durationMs"].includes(key)) {
      if (!count(v)) invalid();
    } else if (key === "contextCounts")
      counts(v, ["turns", "researchEntries", "analysisRuns", "markers"]);
    else if (key === "outputCounts")
      counts(v, [
        "blocks",
        "characters",
        "results",
        "clusters",
        "suggested",
        "ambiguous",
        "unresolved",
      ]);
    else if (key === "genes" || key === "sourceIds") {
      if (
        !Array.isArray(v) ||
        v.length > (key === "genes" ? 100 : 50) ||
        v.some(
          (entry) => !text(entry, 160) || !/^[A-Za-z0-9_.:-]+$/.test(entry),
        )
      )
        invalid();
    } else if (key === "reference") {
      if (
        !isObject(v) ||
        Object.keys(v).some(
          (k) =>
            ![
              "provider",
              "requestId",
              "retrievedAt",
              "recordCount",
              "contentSha256",
            ].includes(k),
        )
      )
        invalid();
      for (const [k, item] of Object.entries(v)) {
        if (k === "recordCount") {
          if (!count(item)) invalid();
        } else if (k === "contentSha256") {
          if (typeof item !== "string" || !/^[a-f0-9]{64}$/.test(item))
            invalid();
        } else if (k === "retrievedAt") {
          if (
            !text(item, 40) ||
            !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(item) ||
            !Number.isFinite(Date.parse(item))
          )
            invalid();
        } else if (!text(item, 160) || !/^[A-Za-z0-9_.:/ -]+$/.test(item))
          invalid();
      }
    } else if (key === "resultId") {
      if (typeof v !== "string" || !UUID.test(v)) invalid();
    } else if (
      !text(v, key === "artifactVersion" ? 160 : 120) ||
      !/^[A-Za-z0-9_.:/ -]+$/.test(v)
    )
      invalid();
  }
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 16000) invalid();
  return value;
}

/** Works with a pg Pool or the caller's transaction; no raw prompts or provider errors. */
export async function appendActivity(connection, event) {
  if (
    !isObject(event) ||
    Object.keys(event).some(
      (k) =>
        ![
          "ownerId",
          "projectId",
          "turnId",
          "spanId",
          "parentSpanId",
          "kind",
          "phase",
          "name",
          "summary",
          "data",
        ].includes(k),
    ) ||
    ![event.ownerId, event.projectId, event.turnId].every(
      (id) => typeof id === "string" && UUID.test(id),
    ) ||
    typeof event.spanId !== "string" ||
    !IDENTIFIER.test(event.spanId) ||
    (event.parentSpanId != null &&
      (typeof event.parentSpanId !== "string" ||
        !IDENTIFIER.test(event.parentSpanId))) ||
    event.parentSpanId === event.spanId ||
    !KINDS.has(event.kind) ||
    !PHASES.has(event.phase) ||
    !text(event.name, 160) ||
    !text(event.summary, 2000)
  )
    invalid();
  const data = validateActivityData(event.data);
  const args = [
    event.ownerId,
    event.projectId,
    event.turnId,
    event.spanId,
    event.parentSpanId ?? null,
    event.kind,
    event.phase,
    event.name,
    event.summary,
    JSON.stringify(data),
  ];
  const inserted = await connection.query(
    `INSERT INTO agent_activity_events(owner_id,project_id,turn_id,span_id,parent_span_id,kind,phase,name,summary,data)
     SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb FROM agent_turns t JOIN projects p ON p.id=t.project_id
     WHERE t.id=$3 AND t.project_id=$2 AND t.owner_id=$1 AND p.owner_id=$1 AND t.activity_version=1
     ON CONFLICT(turn_id,span_id,phase) DO NOTHING RETURNING id,position::text,created_at`,
    args,
  );
  if (inserted.rows[0]) return inserted.rows[0];
  // A separate statement also sees an idempotent concurrent winner after its commit.
  const existing = await connection.query(
    `SELECT e.id,e.position::text,e.created_at,
       (e.parent_span_id IS NOT DISTINCT FROM $5::text AND e.kind=$6 AND e.name=$8 AND e.summary=$9 AND e.data=$10::jsonb) AS identical
     FROM agent_activity_events e JOIN agent_turns t ON t.id=e.turn_id JOIN projects p ON p.id=t.project_id
     WHERE e.owner_id=$1 AND e.project_id=$2 AND e.turn_id=$3 AND e.span_id=$4 AND e.phase=$7
       AND t.owner_id=$1 AND t.project_id=$2 AND p.owner_id=$1 AND t.activity_version=1`,
    args,
  );
  if (!existing.rows[0]) throw new ActivityWriteError("activity_access_denied");
  if (!existing.rows[0].identical)
    throw new ActivityWriteError("activity_event_conflict");
  const { id, position, created_at } = existing.rows[0];
  return { id, position, created_at };
}
