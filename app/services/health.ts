import "server-only";
import { database } from "@/app/adapters/database";
import { keycloakConfiguration } from "@/app/adapters/auth";
import { logFailure } from "@/app/core/errors";

export interface ServiceHealth {
  name: string;
  status: "ready" | "unavailable" | "pending";
  detail: string;
}
export async function foundationHealth(): Promise<ServiceHealth[]> {
  return Promise.all(
    [
      {
        name: "PostgreSQL",
        check: async () => {
          await database().query("SELECT id FROM projects LIMIT 0");
          await database().query(
            "SELECT id, project_id, author_id, submission_id, fingerprint, position, kind, payload, reference_entry_id, created_at FROM research_entries LIMIT 0",
          );
        },
      },
      {
        name: "Keycloak",
        check: async () => {
          await keycloakConfiguration();
        },
      },
    ].map(async ({ name, check }): Promise<ServiceHealth> => {
      try {
        await check();
        return { name, status: "ready", detail: "Connection verified" };
      } catch (error) {
        logFailure(`health.${name}`, error);
        return {
          name,
          status: "unavailable",
          detail: "Connection failed; check service logs",
        };
      }
    }),
  );
}
export async function serviceHealth(): Promise<ServiceHealth[]> {
  return [
    ...(await foundationHealth()),
    {
      name: "Zetaris",
      status: "pending",
      detail: "Marker sources and query integration",
    },
    {
      name: "Nemotron",
      status: "pending",
      detail: "Model selection and gateway connection",
    },
    {
      name: "H-MEM",
      status: "pending",
      detail: "Memory retrieval and provenance implementation",
    },
    {
      name: "NVIDIA NeMo Files",
      status: "pending",
      detail: "File service and persistence integration",
    },
    {
      name: "NVIDIA Intake / Studio",
      status: "pending",
      detail: "OTLP exporter and real trace verification",
    },
  ];
}
