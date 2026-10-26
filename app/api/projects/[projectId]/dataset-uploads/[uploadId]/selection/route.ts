import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { readJsonBody } from "@/app/api/read-body";
import { uploadHeaders, uploadError } from "../../respond";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; uploadId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const { projectId, uploadId } = await context.params;
    await services.access.requireProject(user.id, projectId);
    const body = await readJsonBody(request, 4096);
    if (!body.ok) return body.response;
    return Response.json(
      await services.datasetUploads.select(
        user.id,
        projectId,
        uploadId,
        body.value,
      ),
      { headers: uploadHeaders },
    );
  } catch (e) {
    return uploadError(e);
  }
}
