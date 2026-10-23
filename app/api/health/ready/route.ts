import { foundationHealth } from "@/app/services/health";
export const dynamic = "force-dynamic";
export async function GET() {
  const ready = (await foundationHealth()).every(
    (service) => service.status === "ready",
  );
  return Response.json(
    { status: ready ? "ready" : "unavailable", scope: "workspace-foundation" },
    { status: ready ? 200 : 503 },
  );
}
