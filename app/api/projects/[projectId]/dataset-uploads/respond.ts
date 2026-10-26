import { DatasetUploadError } from "@/app/core/dataset-upload";
import { apiError } from "@/app/api/responses";
export const uploadHeaders = { "Cache-Control": "no-store" };
export function uploadError(error: unknown) {
  if (error instanceof DatasetUploadError)
    return Response.json(
      {
        error: error.message,
        code: error.code,
        ...(error.offset !== undefined ? { offset: error.offset } : {}),
      },
      { status: error.status, headers: uploadHeaders },
    );
  return apiError(error);
}
