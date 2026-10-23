import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { ChatValidationError } from "@/app/core/chat";
import { apiError } from "../../../responses";

type RouteContext = { params: Promise<{ projectId: string }> };
type JsonBody =
  { ok: true; value: unknown } | { ok: false; response: Response };
const noStore = { "Cache-Control": "no-store" };
export const dynamic = "force-dynamic";

async function readBody(request: Request): Promise<JsonBody> {
  const reader = request.body?.getReader();
  if (!reader)
    return {
      ok: false,
      response: Response.json({ error: "JSON body required" }, { status: 400 }),
    };
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) {
        await reader.cancel();
        return {
          ok: false,
          response: Response.json(
            { error: "Chat submission is too large" },
            { status: 413 },
          ),
        };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    return { ok: true, value: JSON.parse(json) as unknown };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Valid JSON required" },
        { status: 400 },
      ),
    };
  }
}

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
    const body = await readBody(request);
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
    const body = await readBody(request);
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
