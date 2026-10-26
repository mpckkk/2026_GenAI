import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
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
    return Response.json(
      await services.datasetUploads.complete(user.id, projectId, uploadId),
      { headers: uploadHeaders },
    );
  } catch (e) {
    return uploadError(e);
  }
}
