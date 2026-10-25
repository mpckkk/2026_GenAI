import { services } from "@/app/bootstrap";
import { assertSameOrigin } from "@/app/config";
import { readJsonBody } from "@/app/api/read-body";
import { markerImportLimits } from "@/app/core/marker-import";
import { apiError } from "@/app/api/responses";

type Context = { params: Promise<{ projectId: string }> };
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request, context: Context) {
  try {
    const user = await services.auth.requireUser();
    const { projectId } = await context.params;
    const download = new URL(request.url).searchParams.get("download");
    if (download) {
      const file = await services.markerImports.download(
        user.id,
        projectId,
        download,
      );
      return new Response(file.csv, {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="markers.csv"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        },
      });
    }
    return Response.json(
      await services.markerImports.list(user.id, projectId),
      { headers },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const user = await services.auth.requireUser();
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    }
    const { projectId } = await context.params;
    await services.access.requireProject(user.id, projectId);
    const body = await readJsonBody(request, 1600000);
    if (!body.ok) return body.response;
    if (
      body.value &&
      typeof body.value === "object" &&
      "csv" in body.value &&
      typeof body.value.csv === "string" &&
      Buffer.byteLength(body.value.csv, "utf8") > markerImportLimits.bytes
    )
      return Response.json(
        { error: "Choose a marker CSV smaller than 256 KiB." },
        { status: 413 },
      );
    return Response.json(
      await services.markerImports.save(user.id, projectId, body.value),
      { headers },
    );
  } catch (error) {
    return apiError(error);
  }
}
