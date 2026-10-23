import "server-only";
import type { Pool, PoolClient } from "pg";
import type {
  ChatRepository,
  ChatRuntime,
  ChatStatus,
  ChatTurn,
  ChatWorkspace,
  SubmitChatInput,
} from "@/app/core/chat";
import {
  ChatActiveTurnError,
  ChatCleanupPendingError,
  ChatRuntimeUnavailableError,
  ChatSubmissionConflictError,
  ChatTurnNotFoundError,
  ChatValidationError,
} from "@/app/core/chat";
import { ProjectNotFoundError, logFailure } from "@/app/core/errors";
import { database } from "./database";
import type { ResponseDocument } from "@/app/core/agent-response.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POSITION = "9223372036854775807";
const COLUMNS =
  "t.id, t.submission_id, t.position::text AS position, t.prompt, t.response_text, t.response_document, t.status, t.progress, t.error_code, t.created_at, t.updated_at";
type Row = {
  id: string;
  submission_id: string;
  position: string;
  prompt: string;
  response_text: string | null;
  response_document: ResponseDocument | null;
  status: ChatStatus;
  progress: string;
  error_code: string | null;
  created_at: Date;
  updated_at: Date;
};

function turn(row: Row): ChatTurn {
  return {
    id: row.id,
    submissionId: row.submission_id,
    position: row.position,
    prompt: row.prompt,
    response: row.response_text,
    responseDocument: row.response_document,
    status: row.status,
    progress: row.progress,
    errorCode: row.error_code,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function validateCursor(before?: string) {
  if (before === undefined) return;
  if (
    typeof before !== "string" ||
    !/^[1-9][0-9]{0,18}$/.test(before) ||
    before.length > MAX_POSITION.length ||
    (before.length === MAX_POSITION.length && before > MAX_POSITION)
  )
    throw new ChatValidationError({ before: "Use a valid chat page cursor." });
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

/** Shared by queue admission, workspace status and the service-health display. */
export async function chatRuntime(
  connection: Pool | PoolClient = database(),
): Promise<ChatRuntime> {
  const result = await connection.query<{ ready: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM agent_workers
       WHERE status='ready' AND heartbeat_at > clock_timestamp() - interval '30 seconds'
     ) AS ready`,
  );
  return result.rows[0].ready
    ? { status: "ready", detail: "The agent is ready." }
    : {
        status: "unavailable",
        detail: "The agent is temporarily unavailable.",
      };
}

async function ownedTransaction<T>(
  userId: string,
  projectId: string,
  operation: (connection: PoolClient) => Promise<T>,
): Promise<T> {
  const connection = await database().connect();
  let transactionOpen = false;
  let destroyClient = false;
  try {
    await connection.query("BEGIN");
    transactionOpen = true;
    await requireOwner(connection, userId, projectId, true);
    const result = await operation(connection);
    await connection.query("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await connection.query("ROLLBACK");
      } catch (rollbackError) {
        destroyClient = true;
        logFailure("chat.transaction.rollback_failed", rollbackError);
      }
    }
    throw error;
  } finally {
    connection.release(destroyClient);
  }
}

export class PostgresChat implements ChatRepository {
  async workspace(
    userId: string,
    projectId: string,
    before?: string,
  ): Promise<ChatWorkspace> {
    await requireOwner(database(), userId, projectId);
    validateCursor(before);
    const [result, runtime] = await Promise.all([
      database().query<Row>(
        `SELECT ${COLUMNS} FROM agent_turns t
         JOIN projects p ON p.id=t.project_id
         WHERE t.project_id=$1 AND t.owner_id=$2 AND p.owner_id=$2
           AND ($3::bigint IS NULL OR t.position<$3::bigint)
         ORDER BY t.position DESC LIMIT 51`,
        [projectId, userId, before ?? null],
      ),
      chatRuntime(),
    ]);
    const selected = result.rows.slice(0, 50);
    const nextBefore =
      result.rows.length > 50 ? selected[selected.length - 1].position : null;
    return { turns: selected.reverse().map(turn), nextBefore, runtime };
  }

  async submit(
    userId: string,
    projectId: string,
    input: SubmitChatInput,
  ): Promise<ChatTurn> {
    return ownedTransaction(userId, projectId, async (connection) => {
      if (!UUID.test(input.submissionId))
        throw new ChatValidationError({
          submissionId: "Use a valid submission identifier.",
        });
      if (
        typeof input.prompt !== "string" ||
        !input.prompt.trim() ||
        input.prompt.length > 12000 ||
        /\0|[\uD800-\uDFFF]/u.test(input.prompt)
      )
        throw new ChatValidationError({
          prompt: "Enter a prompt of 1–12000 valid text characters.",
        });
      // Replay precedes admission checks: a saved prompt stays retryable offline.
      const existing = await connection.query<Row>(
        `SELECT ${COLUMNS} FROM agent_turns t
         JOIN projects p ON p.id=t.project_id
         WHERE t.project_id=$1 AND t.owner_id=$2 AND p.owner_id=$2 AND t.submission_id=$3`,
        [projectId, userId, input.submissionId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].prompt !== input.prompt)
          throw new ChatSubmissionConflictError();
        return turn(existing.rows[0]);
      }
      if ((await chatRuntime(connection)).status !== "ready")
        throw new ChatRuntimeUnavailableError();
      // One snapshot must see both running and terminal-but-not-cleaned turns.
      // Separate checks could miss a worker transition between their reads.
      const blocking = await connection.query<{ status: ChatStatus }>(
        `SELECT t.status FROM agent_turns t JOIN projects p ON p.id=t.project_id
         WHERE t.project_id=$1 AND t.owner_id=$2 AND p.owner_id=$2
           AND (t.status IN ('queued', 'running') OR (
             t.status IN ('completed', 'failed', 'cancelled')
             AND t.sandbox_name IS NOT NULL
           )) LIMIT 1`,
        [projectId, userId],
      );
      if (blocking.rows[0]) {
        if (["queued", "running"].includes(blocking.rows[0].status))
          throw new ChatActiveTurnError();
        throw new ChatCleanupPendingError();
      }
      const inserted = await connection.query<Row>(
        `INSERT INTO agent_turns AS t (project_id, owner_id, submission_id, prompt)
         SELECT p.id, $2::uuid, $3::uuid, $4 FROM projects p
         WHERE p.id=$1 AND p.owner_id=$2
         RETURNING ${COLUMNS}`,
        [projectId, userId, input.submissionId, input.prompt],
      );
      if (!inserted.rows[0]) throw new ProjectNotFoundError();
      return turn(inserted.rows[0]);
    });
  }

  async cancel(
    userId: string,
    projectId: string,
    turnId: string,
  ): Promise<ChatTurn> {
    return ownedTransaction(userId, projectId, async (connection) => {
      if (!UUID.test(turnId))
        throw new ChatValidationError({
          turnId: "Use a valid chat turn identifier.",
        });
      const selected = await connection.query<
        Row & { cancel_requested: boolean }
      >(
        `SELECT ${COLUMNS}, t.cancel_requested FROM agent_turns t
         JOIN projects p ON p.id=t.project_id
         WHERE t.project_id=$1 AND t.owner_id=$2 AND p.owner_id=$2 AND t.id=$3
         FOR UPDATE OF t`,
        [projectId, userId, turnId],
      );
      const current = selected.rows[0];
      if (!current) throw new ChatTurnNotFoundError();
      if (
        !["queued", "running"].includes(current.status) ||
        current.cancel_requested
      )
        return turn(current);
      const cancelled = await connection.query<Row>(
        `UPDATE agent_turns t SET
           cancel_requested=true,
           status=CASE WHEN t.status='queued' THEN 'cancelled' ELSE t.status END,
           progress=CASE WHEN t.status='queued' THEN 'Cancelled' ELSE 'Cancellation requested' END,
           finished_at=CASE WHEN t.status='queued' THEN now() ELSE t.finished_at END,
           updated_at=now()
         FROM projects p
         WHERE t.project_id=$1 AND t.owner_id=$2 AND p.id=t.project_id
           AND p.owner_id=$2 AND t.id=$3
         RETURNING ${COLUMNS}`,
        [projectId, userId, turnId],
      );
      return turn(cancelled.rows[0]);
    });
  }
}
