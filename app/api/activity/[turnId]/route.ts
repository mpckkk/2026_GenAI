import { services } from "@/app/bootstrap";
import { ChatValidationError } from "@/app/core/chat";
import { apiError } from "../../responses";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(
  request: Request,
  context: { params: Promise<{ turnId: string }> },
) {
  try {
    const user = await services.auth.requireUser();
    if (new URL(request.url).searchParams.size)
      throw new ChatValidationError({
        filters: "This activity detail endpoint does not accept filters.",
      });
    const { turnId } = await context.params;
    return Response.json(await services.activity.detail(user.id, turnId), {
      headers,
    });
  } catch (error) {
    const response = apiError(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
