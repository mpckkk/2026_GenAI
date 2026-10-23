import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { apiError } from "../responses";

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
      typeof body?.projectId !== "string" ||
      !Array.isArray(body.genes) ||
      body.genes.length < 1 ||
      body.genes.length > 200 ||
      !body.genes.every(
        (gene: unknown) =>
          typeof gene === "string" && gene.length > 0 && gene.length <= 100,
      )
    ) {
      return Response.json(
        { error: "Provide a project ID and 1–200 marker genes" },
        { status: 400 },
      );
    }
    return Response.json(await services.annotation.run(user.id, body));
  } catch (error) {
    return apiError(error);
  }
}
