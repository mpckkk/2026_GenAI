import { services } from "@/app/bootstrap";
import { apiError } from "@/app/api/responses";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; runId: string }> },
) {
  try {
    const user = await services.auth.requireUser();
    const { projectId, runId } = await context.params;
    return Response.json(
      await services.analysis.annotationMap(user.id, projectId, runId),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
