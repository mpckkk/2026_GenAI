import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { apiError } from "../responses";

export async function GET() {
  try {
    const user = await services.auth.requireUser();
    return Response.json(await services.projects.list(user.id));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (
      typeof body?.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 120
    )
      return Response.json(
        { error: "Enter a project name (1–120 characters)" },
        { status: 400 },
      );
    return Response.json(await services.projects.create(user.id, body.name), {
      status: 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
