import "server-only";
import type { Pool, PoolClient } from "pg";
import type {
  ResearchCommand,
  ContextEntry,
  MarkerEntry,
  ResearchEntry,
  ResearchPage,
  ResearchPayload,
  ResearchRepository,
} from "@/app/core/research";
import {
  ProjectNotFoundError,
  ResearchConflictError,
  ResearchValidationError,
  logFailure,
} from "@/app/core/errors";
import type { MarkerEvidenceRun } from "@/app/core/evidence";
import { database } from "./database";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POSITION = "9223372036854775807";
const COLUMNS =
  "e.id, e.project_id, e.submission_id, e.position::text AS position, e.kind, e.payload, e.created_at";
type Row = {
  id: string;
  project_id: string;
  submission_id: string;
  position: string;
  kind: ResearchPayload["kind"];
  payload: ResearchPayload;
  created_at: Date;
};

function entry(row: Row): ResearchEntry {
  if (!row.payload || row.payload.kind !== row.kind)
    throw new Error("Research storage payload does not match its entry kind");
  return {
    ...row.payload,
    id: row.id,
    projectId: row.project_id,
    submissionId: row.submission_id,
    position: row.position,
    actor: "researcher",
    createdAt: row.created_at.toISOString(),
  };
}

function pageLimit(value: number | undefined, defaultLimit = 50): number {
  if (value === undefined) return defaultLimit;
  if (!Number.isSafeInteger(value) || value < 1)
    throw new ResearchValidationError({
      limit: "Use a positive whole-number page size.",
    });
  return Math.min(value, 100);
}

function pageCursor(before?: string) {
  if (before === undefined) return;
  if (
    !/^[1-9][0-9]{0,18}$/.test(before) ||
    before.length > MAX_POSITION.length ||
    (before.length === MAX_POSITION.length && before > MAX_POSITION)
  )
    throw new ResearchValidationError({
      before: "Use a valid conversation page cursor.",
    });
}

async function requireOwner(
  connection: Pool | PoolClient,
  userId: string,
  projectId: string,
  lock = false,
) {
  if (!UUID.test(projectId) || !UUID.test(userId))
    throw new ProjectNotFoundError();
  const result = await connection.query(
    `SELECT id FROM projects WHERE id=$1 AND owner_id=$2${lock ? " FOR UPDATE" : ""}`,
    [projectId, userId],
  );
  if (!result.rows.length) throw new ProjectNotFoundError();
}

export class PostgresResearch implements ResearchRepository {
  async list(
    userId: string,
    projectId: string,
    before?: string,
    limit?: number,
  ): Promise<ResearchPage> {
    await requireOwner(database(), userId, projectId);
    pageCursor(before);
    const size = pageLimit(limit);
    const result = await database().query<Row>(
      `SELECT ${COLUMNS} FROM research_entries e
       JOIN projects p ON p.id=e.project_id
       WHERE e.project_id=$1 AND p.owner_id=$2
         AND ($3::bigint IS NULL OR e.position<$3::bigint)
       ORDER BY e.position DESC LIMIT $4`,
      [projectId, userId, before ?? null, size + 1],
    );
    const selected = result.rows.slice(0, size);
    const nextBefore =
      result.rows.length > size ? selected[selected.length - 1].position : null;
    return { entries: selected.reverse().map(entry), nextBefore };
  }

  async findOwned(
    userId: string,
    projectId: string,
    entryId: string,
  ): Promise<ResearchEntry | null> {
    await requireOwner(database(), userId, projectId);
    if (!UUID.test(entryId)) return null;
    const result = await database().query<Row>(
      `SELECT ${COLUMNS} FROM research_entries e
       JOIN projects p ON p.id=e.project_id
       WHERE e.project_id=$1 AND p.owner_id=$2 AND e.id=$3`,
      [projectId, userId, entryId],
    );
    return result.rows[0] ? entry(result.rows[0]) : null;
  }

  async latestContext(
    userId: string,
    projectId: string,
  ): Promise<ContextEntry | null> {
    await requireOwner(database(), userId, projectId);
    const result = await database().query<Row>(
      `SELECT ${COLUMNS} FROM research_entries e
       JOIN projects p ON p.id=e.project_id
       WHERE e.project_id=$1 AND p.owner_id=$2 AND e.kind='context'
       ORDER BY e.position DESC LIMIT 1`,
      [projectId, userId],
    );
    if (!result.rows[0]) return null;
    const found = entry(result.rows[0]);
    if (found.kind !== "context")
      throw new Error("Expected a stored context entry");
    return found;
  }

  async listMarkers(
    userId: string,
    projectId: string,
    limit?: number,
  ): Promise<MarkerEntry[]> {
    await requireOwner(database(), userId, projectId);
    const result = await database().query<Row>(
      `SELECT ${COLUMNS} FROM research_entries e
       JOIN projects p ON p.id=e.project_id
       WHERE e.project_id=$1 AND p.owner_id=$2 AND e.kind='markers'
       ORDER BY e.position DESC LIMIT $3`,
      [projectId, userId, pageLimit(limit, 100)],
    );
    return result.rows.map((row) => {
      const found = entry(row);
      if (found.kind !== "markers")
        throw new Error("Expected a stored marker entry");
      return found;
    });
  }

  async append(
    userId: string,
    projectId: string,
    input: {
      submissionId: string;
      fingerprint: string;
      payload:
        ResearchPayload | Extract<ResearchCommand, { kind: "evidence_review" }>;
    },
  ): Promise<ResearchEntry> {
    const connection = await database().connect();
    let transactionOpen = false;
    let connectionReleased = false;
    try {
      await connection.query("BEGIN");
      transactionOpen = true;
      // Serialize writes to an owned experiment before retry and reference checks.
      await requireOwner(connection, userId, projectId, true);
      if (
        !UUID.test(input.submissionId) ||
        !/^[a-f0-9]{64}$/.test(input.fingerprint)
      )
        throw new ResearchValidationError({
          submissionId: "Use a valid submission identifier.",
        });
      const existing = await connection.query<Row & { fingerprint: string }>(
        `SELECT ${COLUMNS}, e.fingerprint FROM research_entries e
         JOIN projects p ON p.id=e.project_id
         WHERE e.project_id=$1 AND p.owner_id=$2 AND e.submission_id=$3`,
        [projectId, userId, input.submissionId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].fingerprint !== input.fingerprint)
          throw new ResearchConflictError();
        await connection.query("COMMIT");
        transactionOpen = false;
        return entry(existing.rows[0]);
      }

      let payload = input.payload;
      let referenceId: string | null = null;
      if (
        payload.kind === "markers" ||
        payload.kind === "manual_review" ||
        payload.kind === "evidence_review"
      ) {
        referenceId =
          payload.kind === "markers"
            ? payload.contextEntryId
            : payload.markerEntryId;
        if (referenceId !== null) {
          const field =
            payload.kind === "markers" ? "contextEntryId" : "markerEntryId";
          if (!UUID.test(referenceId))
            throw new ResearchValidationError({
              [field]: "Choose a valid entry in this experiment.",
            });
          const references = await connection.query<Row>(
            `SELECT ${COLUMNS} FROM research_entries e
             JOIN projects p ON p.id=e.project_id
             WHERE e.project_id=$1 AND p.owner_id=$2 AND e.id=$3`,
            [projectId, userId, referenceId],
          );
          const reference = references.rows[0]
            ? entry(references.rows[0])
            : null;
          if (payload.kind === "markers") {
            if (
              reference?.kind !== "context" ||
              reference.context.speciesId !== payload.speciesId
            )
              throw new ResearchValidationError({
                contextEntryId:
                  "Choose a context for this species in this experiment.",
              });
            // Take the snapshot from the immutable source, never a supplied copy.
            payload = { ...payload, context: reference.context };
          } else if (reference?.kind !== "markers") {
            throw new ResearchValidationError({
              markerEntryId: "Choose a marker set in this experiment.",
            });
          }
        } else if (payload.kind === "markers") {
          payload = { ...payload, context: null };
        } else {
          throw new ResearchValidationError({
            markerEntryId: "Choose a marker set in this experiment.",
          });
        }
      }

      let evidenceRunId: string | null = null;
      if (payload.kind === "evidence_review") {
        evidenceRunId = payload.evidenceRunId;
        if (!UUID.test(evidenceRunId))
          throw new ResearchValidationError({
            evidenceRunId: "Choose a valid evidence run.",
          });
        const run = await connection.query(
          `SELECT e.id,e.project_id,e.turn_id,e.marker_entry_id,e.result,e.created_at FROM marker_evidence_runs e
           JOIN projects p ON p.id=e.project_id JOIN agent_turns t ON t.id=e.turn_id
           WHERE e.id=$1 AND e.project_id=$2 AND e.owner_id=$3 AND p.owner_id=$3
             AND t.owner_id=$3 AND t.project_id=$2 AND t.status='completed'`,
          [evidenceRunId, projectId, userId],
        );
        const row = run.rows[0];
        if (!row || row.marker_entry_id !== payload.markerEntryId)
          throw new ResearchValidationError({
            evidenceRunId:
              "Choose completed evidence for this marker set in this experiment.",
          });
        const evidence: MarkerEvidenceRun = {
          ...row.result,
          id: row.id,
          projectId: row.project_id,
          turnId: row.turn_id,
          createdAt: row.created_at.toISOString(),
        };
        const selectedCellType = payload.cellType;
        if (
          !["candidate", "unresolved", "rejected"].includes(payload.decision) ||
          (payload.decision === "candidate"
            ? !evidence.candidates.some(
                (candidate) => candidate.cellType === selectedCellType,
              )
            : payload.cellType !== null)
        ) {
          throw new ResearchValidationError({
            cellType:
              "Choose a candidate present in this evidence, or an unresolved/rejected decision.",
          });
        }
        payload = { ...payload, evidence };
      }

      const inserted = await connection.query<Row>(
        `INSERT INTO research_entries AS e
           (project_id, author_id, submission_id, fingerprint, kind, payload, reference_entry_id, evidence_run_id)
         SELECT p.id, $2::uuid, $3::uuid, $4, $5, $6::jsonb, $7::uuid, $8::uuid
         FROM projects p WHERE p.id=$1 AND p.owner_id=$2
         RETURNING ${COLUMNS}`,
        [
          projectId,
          userId,
          input.submissionId,
          input.fingerprint,
          payload.kind,
          JSON.stringify(payload),
          referenceId,
          evidenceRunId,
        ],
      );
      if (!inserted.rows[0]) throw new ProjectNotFoundError();
      await connection.query("COMMIT");
      transactionOpen = false;
      return entry(inserted.rows[0]);
    } catch (error) {
      if (transactionOpen) {
        try {
          await connection.query("ROLLBACK");
        } catch (rollbackError) {
          logFailure("research.transaction.rollback_failed", rollbackError);
          // Evict a connection whose transaction state can no longer be trusted.
          connection.release(true);
          connectionReleased = true;
          throw error;
        }
      }
      throw error;
    } finally {
      // A failed rollback already evicted this client from the pool.
      if (!connectionReleased) {
        connection.release();
      }
    }
  }
}
