import { services } from "@/app/bootstrap";
import { apiError } from "../../responses";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await services.auth.requireUser();
    return Response.json(
      await services.access.requireProject(
        user.id,
        (await context.params).projectId,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
