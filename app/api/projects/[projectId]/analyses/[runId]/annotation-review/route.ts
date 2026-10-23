import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { apiError } from "@/app/api/responses";
import { readJsonBody } from "@/app/api/read-body";

export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; runId: string }> },
) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const { projectId, runId } = await context.params;
    await services.access.requireProject(user.id, projectId);
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    return Response.json(
      await services.analysis.reviewAnnotation(
        user.id,
        projectId,
        runId,
        body.value,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
