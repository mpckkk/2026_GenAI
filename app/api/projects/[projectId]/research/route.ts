import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { apiError } from "../../../responses";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await services.auth.requireUser();
    const { projectId } = await context.params;
    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    const workspace = await services.research.workspace(
      user.id,
      projectId,
      before,
    );
    return Response.json(workspace, {
      headers: { "Cache-Control": "no-store" },
    });
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

    // Bound transport input independently of the domain's per-field limits.
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json({ error: "JSON body required" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 131072) {
        await reader.cancel();
        return Response.json(
          { error: "Research entry is too large" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return Response.json({ error: "Valid JSON required" }, { status: 400 });
    }
    const entry = await services.research.append(user.id, projectId, input);
    return Response.json(entry, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
