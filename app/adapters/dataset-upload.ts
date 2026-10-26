import "server-only";
import { constants } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import type { PoolClient } from "pg";
import { database } from "./database";
import { ProjectNotFoundError } from "../core/errors";
import {
  DatasetUploadError,
  datasetUploadLimits,
  uploadUuid,
} from "../core/dataset-upload";

type Row = Record<string, unknown>;
function receipt(row: Row) {
  return {
    uploadId: row.id,
    projectId: row.project_id,
    filename: row.filename,
    sizeBytes: Number(row.size_bytes),
    offset: Number(row.offset_bytes),
    fileFingerprint: row.file_fingerprint,
    status: row.status,
    sha256: row.sha256,
    inspection: row.inspection,
    selection: row.selection,
    dataset: row.dataset,
    datasetId: row.dataset_id,
    error: row.error_message,
    errorCode: row.error_code,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    url: `/app/projects/${row.project_id}`,
    ...datasetUploadLimits,
  };
}
function inputObject(input: unknown): Row {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new DatasetUploadError(
      "invalid_input",
      "Valid upload details are required.",
    );
  return input as Row;
}
function sourceDirectory(id: string) {
  if (!process.env.CELLORAS_UPLOAD_DIR)
    throw new DatasetUploadError(
      "uploads_unavailable",
      "Dataset upload storage is not configured.",
      503,
    );
  if (!uploadUuid.test(id)) throw new ProjectNotFoundError();
  return path.join(
    path.resolve(/* turbopackIgnore: true */ process.env.CELLORAS_UPLOAD_DIR),
    id,
  );
}
async function requireOwner(
  client: PoolClient,
  userId: string,
  projectId: string,
) {
  if (!uploadUuid.test(userId) || !uploadUuid.test(projectId))
    throw new ProjectNotFoundError();
  const r = await client.query(
    "SELECT id FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE",
    [projectId, userId],
  );
  if (!r.rowCount) throw new ProjectNotFoundError();
}
async function ownedUpload(
  client: PoolClient,
  userId: string,
  projectId: string,
  uploadId: string,
) {
  await requireOwner(client, userId, projectId);
  if (!uploadUuid.test(uploadId)) throw new ProjectNotFoundError();
  const r = await client.query(
    "SELECT * FROM dataset_uploads WHERE id=$1 AND project_id=$2 AND owner_id=$3 FOR UPDATE",
    [uploadId, projectId, userId],
  );
  if (!r.rows[0]) throw new ProjectNotFoundError();
  return r.rows[0] as Row;
}
async function transaction<T>(action: (client: PoolClient) => Promise<T>) {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const value = await action(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    const detail = error as { code?: unknown; constraint?: unknown };
    console.error(
      JSON.stringify({
        event: "dataset.upload.failed",
        code: typeof detail.code === "string" ? detail.code : "unknown",
        constraint:
          typeof detail.constraint === "string" ? detail.constraint : undefined,
      }),
    );
    throw error;
  } finally {
    client.release();
  }
}
export class PostgresDatasetUploads {
  async list(userId: string, projectId: string) {
    return transaction(async (c) => {
      await requireOwner(c, userId, projectId);
      const [rows, attached] = await Promise.all([
        c.query(
          "SELECT * FROM dataset_uploads WHERE project_id=$1 AND owner_id=$2 ORDER BY created_at DESC LIMIT 1",
          [projectId, userId],
        ),
        c.query("SELECT 1 FROM project_datasets WHERE project_id=$1", [
          projectId,
        ]),
      ]);
      return {
        upload: rows.rows[0] ? receipt(rows.rows[0]) : null,
        attached: !!attached.rowCount,
        ...datasetUploadLimits,
      };
    });
  }
  async get(userId: string, projectId: string, uploadId: string) {
    return transaction(async (c) =>
      receipt(await ownedUpload(c, userId, projectId, uploadId)),
    );
  }
  async create(userId: string, projectId: string, input: unknown) {
    const v = inputObject(input);
    if (
      Object.keys(v).some(
        (k) => !["filename", "sizeBytes", "fileFingerprint"].includes(k),
      ) ||
      typeof v.filename !== "string" ||
      !/\.h5ad$/i.test(v.filename) ||
      v.filename.length > 200 ||
      /[\x00-\x1f\\/]/.test(v.filename) ||
      typeof v.sizeBytes !== "number" ||
      !Number.isSafeInteger(v.sizeBytes) ||
      v.sizeBytes < 1 ||
      v.sizeBytes > datasetUploadLimits.maxBytes ||
      typeof v.fileFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(v.fileFingerprint)
    )
      throw new DatasetUploadError(
        "invalid_file",
        "Choose an H5AD file up to 4 GiB.",
      );
    return transaction(async (c) => {
      await requireOwner(c, userId, projectId);
      const bound = await c.query(
        "SELECT 1 FROM project_datasets WHERE project_id=$1",
        [projectId],
      );
      if (bound.rowCount)
        throw new DatasetUploadError(
          "dataset_already_attached",
          "This experiment already has a dataset. Start a new experiment to upload another.",
          409,
        );
      const active = await c.query(
        "SELECT 1 FROM dataset_uploads WHERE project_id=$1 AND status<>'failed'",
        [projectId],
      );
      if (active.rowCount)
        throw new DatasetUploadError(
          "upload_exists",
          "Resume this experiment’s existing upload.",
          409,
        );
      const id = randomUUID();
      await mkdir(sourceDirectory(id), { recursive: true, mode: 0o700 });
      const file = await open(
        path.join(sourceDirectory(id), "source.h5ad"),
        constants.O_CREAT |
          constants.O_EXCL |
          constants.O_WRONLY |
          constants.O_NOFOLLOW,
        0o600,
      );
      await file.sync();
      await file.close();
      const rows = await c.query(
        "INSERT INTO dataset_uploads(id,project_id,owner_id,filename,size_bytes,file_fingerprint,dataset_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          id,
          projectId,
          userId,
          v.filename,
          v.sizeBytes,
          v.fileFingerprint,
          `upload-${id}`,
        ],
      );
      console.info(
        JSON.stringify({
          event: "dataset.upload.created",
          projectId,
          uploadId: id,
          sizeBytes: v.sizeBytes,
        }),
      );
      return receipt(rows.rows[0]);
    });
  }
  async append(
    userId: string,
    projectId: string,
    uploadId: string,
    offset: number,
    chunk: Uint8Array,
    sha256: string,
  ) {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      chunk.byteLength < 1 ||
      chunk.byteLength > datasetUploadLimits.chunkSize ||
      !/^[a-f0-9]{64}$/.test(sha256) ||
      createHash("sha256").update(chunk).digest("hex") !== sha256
    )
      throw new DatasetUploadError(
        "chunk_invalid",
        "The upload chunk failed its integrity check. Retry this part.",
      );
    return transaction(async (c) => {
      const row = await ownedUpload(c, userId, projectId, uploadId);
      if (row.status !== "uploading")
        throw new DatasetUploadError(
          "upload_state",
          "This upload is no longer accepting file data.",
          409,
        );
      if (offset !== Number(row.offset_bytes))
        throw new DatasetUploadError(
          "offset_conflict",
          "Resume from the last confirmed upload position.",
          409,
          Number(row.offset_bytes),
        );
      if (offset + chunk.byteLength > Number(row.size_bytes))
        throw new DatasetUploadError(
          "chunk_invalid",
          "The chunk exceeds the declared file size.",
        );
      const file = await open(
        path.join(sourceDirectory(uploadId), "source.h5ad"),
        constants.O_RDWR | constants.O_NOFOLLOW,
      );
      try {
        const info = await file.stat();
        if (!info.isFile() || info.size < offset)
          throw new DatasetUploadError(
            "upload_storage_invalid",
            "The uploaded file is incomplete on storage. Start a new upload.",
            503,
          );
        await file.truncate(offset);
        let written = 0;
        while (written < chunk.byteLength) {
          const r = await file.write(
            chunk,
            written,
            chunk.byteLength - written,
            offset + written,
          );
          if (!r.bytesWritten) throw new Error("upload_write_failed");
          written += r.bytesWritten;
        }
        await file.sync();
      } finally {
        await file.close();
      }
      const updated = await c.query(
        "UPDATE dataset_uploads SET offset_bytes=$2,updated_at=now() WHERE id=$1 RETURNING *",
        [uploadId, offset + chunk.byteLength],
      );
      return receipt(updated.rows[0]);
    });
  }
  async complete(userId: string, projectId: string, uploadId: string) {
    return transaction(async (c) => {
      const row = await ownedUpload(c, userId, projectId, uploadId);
      if (row.status !== "uploading") return receipt(row);
      if (Number(row.offset_bytes) !== Number(row.size_bytes))
        throw new DatasetUploadError(
          "upload_incomplete",
          "Finish uploading the file before inspecting it.",
          409,
          Number(row.offset_bytes),
        );
      const r = await c.query(
        "UPDATE dataset_uploads SET status='inspect_queued',updated_at=now() WHERE id=$1 RETURNING *",
        [uploadId],
      );
      console.info(
        JSON.stringify({
          event: "dataset.inspection.queued",
          projectId,
          uploadId,
        }),
      );
      return receipt(r.rows[0]);
    });
  }
  async select(
    userId: string,
    projectId: string,
    uploadId: string,
    input: unknown,
  ) {
    const v = inputObject(input);
    const fields = [
      "matrix",
      "geneColumn",
      "groupColumn",
      "embedding",
      "genomeBuild",
      "tissue",
      "speciesId",
      "rawCountsConfirmed",
    ];
    if (
      Object.keys(v).some((k) => !fields.includes(k)) ||
      fields
        .slice(0, 7)
        .some(
          (k) =>
            typeof v[k] !== "string" ||
            !(v[k] as string).trim() ||
            (v[k] as string).length > 200,
        ) ||
      v.speciesId !== "glycine-max" ||
      v.rawCountsConfirmed !== true
    )
      throw new DatasetUploadError(
        "selection_invalid",
        "Confirm the count matrix, gene IDs, cell groups, UMAP, soybean tissue and genome build.",
      );
    if (
      !/^[A-Za-z0-9_.-]{1,80}$/.test(v.genomeBuild as string) ||
      !["root", "leaf", "nodule", "stem", "seed", "flower", "other"].includes(
        v.tissue as string,
      )
    )
      throw new DatasetUploadError(
        "selection_invalid",
        "Choose a supported tissue and enter the documented genome build.",
      );
    return transaction(async (c) => {
      const row = await ownedUpload(c, userId, projectId, uploadId);
      if (row.status !== "awaiting_selection")
        throw new DatasetUploadError(
          "upload_state",
          "Wait for file inspection before confirming its data.",
          409,
        );
      const inspection = row.inspection as {
        matrices: { key: string }[];
        geneColumns: { key: string; scope: string }[];
        groupColumns: { key: string }[];
        embeddings: { key: string }[];
      };
      if (
        !inspection.matrices.some((x) => x.key === v.matrix) ||
        !inspection.geneColumns.some(
          (x) =>
            x.key === v.geneColumn &&
            (x.key === "_index" ||
              x.scope === (v.matrix === "raw/X" ? "raw" : "main")),
        ) ||
        !inspection.groupColumns.some((x) => x.key === v.groupColumn) ||
        !inspection.embeddings.some((x) => x.key === v.embedding)
      )
        throw new DatasetUploadError(
          "selection_invalid",
          "Choose fields present in this H5AD file.",
        );
      const r = await c.query(
        "UPDATE dataset_uploads SET status='import_queued',selection=$2::jsonb,updated_at=now() WHERE id=$1 RETURNING *",
        [uploadId, JSON.stringify(v)],
      );
      console.info(
        JSON.stringify({ event: "dataset.import.queued", projectId, uploadId }),
      );
      return receipt(r.rows[0]);
    });
  }
}
