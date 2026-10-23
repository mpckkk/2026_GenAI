import { readJsonBody } from "@/app/api/read-body";
import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { ChatValidationError } from "@/app/core/chat";
import { apiError } from "../../../responses";

type RouteContext = { params: Promise<{ projectId: string }> };
const noStore = { "Cache-Control": "no-store" };
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await services.auth.requireUser();
    const { projectId } = await context.params;
    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    return Response.json(
      await services.chat.workspace(user.id, projectId, before),
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const { projectId } = await context.params;
    await services.access.requireProject(user.id, projectId);
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    return Response.json(
      await services.chat.submit(user.id, projectId, body.value),
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const { projectId } = await context.params;
    await services.access.requireProject(user.id, projectId);
    const body = await readJsonBody(request);
    if (!body.ok) return body.response;
    if (
      !body.value ||
      typeof body.value !== "object" ||
      Array.isArray(body.value)
    )
      throw new ChatValidationError({
        turnId: "Provide a valid cancellation request.",
      });
    const input = body.value as Record<string, unknown>;
    if (Object.keys(input).some((key) => key !== "turnId"))
      throw new ChatValidationError({
        turnId: "This cancellation contains unsupported fields.",
      });
    return Response.json(
      await services.chat.cancel(user.id, projectId, input.turnId),
      { headers: noStore },
    );
  } catch (error) {
    return apiError(error);
  }
}
