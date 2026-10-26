import { services } from "@/app/bootstrap";
import { ChatValidationError } from "@/app/core/chat";
import { apiError } from "../responses";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  try {
    const user = await services.auth.requireUser();
    const params = new URL(request.url).searchParams;
    const filters: Record<string, string> = Object.create(null);
    for (const [key, value] of params) {
      if (Object.hasOwn(filters, key))
        throw new ChatValidationError({
          filters: "Do not repeat an activity filter.",
        });
      filters[key] = value;
    }
    return Response.json(await services.activity.list(user.id, filters), {
      headers,
    });
  } catch (error) {
    const response = apiError(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
