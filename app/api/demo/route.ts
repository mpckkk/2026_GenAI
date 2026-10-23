import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { apiError } from "../responses";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    return Response.json(await services.analysis.startDemo(user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
