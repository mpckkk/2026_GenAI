import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { apiError } from "../responses";
import { readJsonBody } from "../read-body";
import type { AnnotationRequest } from "@/app/core/agent";

export async function POST(request: Request) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("projectId" in body) ||
      typeof body.projectId !== "string"
    ) {
      return Response.json(
        {
          error:
            "Provide an owned project, submission ID and attached dataset ID.",
        },
        { status: 400 },
      );
    }
    return Response.json(
      await services.annotation.run(user.id, body as AnnotationRequest),
      {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
