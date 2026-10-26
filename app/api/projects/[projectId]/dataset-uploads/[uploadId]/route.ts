import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import {
  datasetUploadLimits,
  DatasetUploadError,
} from "@/app/core/dataset-upload";
import { uploadHeaders, uploadError } from "../respond";
export const runtime = "nodejs";
export const maxDuration = 120;
type Context = { params: Promise<{ projectId: string; uploadId: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const user = await services.auth.requireUser();
    const { projectId, uploadId } = await context.params;
    return Response.json(
      await services.datasetUploads.get(user.id, projectId, uploadId),
      { headers: uploadHeaders },
    );
  } catch (e) {
    return uploadError(e);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const { projectId, uploadId } = await context.params;
    // Authorize the exact upload before receiving or buffering file bytes.
    await services.datasetUploads.get(user.id, projectId, uploadId);
    const offset = request.headers.get("Upload-Offset");
    const digest = request.headers.get("X-Chunk-SHA256") || "";
    if (
      offset === null ||
      !/^\d+$/.test(offset) ||
      request.headers.get("Content-Type") !== "application/octet-stream"
    )
      throw new DatasetUploadError(
        "chunk_invalid",
        "Send a file chunk with its confirmed offset and checksum.",
      );
    const reader = request.body?.getReader();
    if (!reader)
      throw new DatasetUploadError(
        "chunk_invalid",
        "A file chunk is required.",
      );
    const parts: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > datasetUploadLimits.chunkSize) {
        await reader.cancel();
        throw new DatasetUploadError(
          "chunk_too_large",
          "Upload chunks must be at most 8 MiB.",
          413,
        );
      }
      parts.push(value);
    }
    return Response.json(
      await services.datasetUploads.append(
        user.id,
        projectId,
        uploadId,
        Number(offset),
        Buffer.concat(parts),
        digest,
      ),
      { headers: uploadHeaders },
    );
  } catch (e) {
    return uploadError(e);
  }
}
