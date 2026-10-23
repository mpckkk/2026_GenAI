import { LocalScientificData } from "../adapters/scientific-data.mjs";
import { CuratedLiterature } from "../adapters/literature.mjs";
import "server-only";
import { PublishedMarkerReference } from "@/app/adapters/marker-reference.mjs";
import { database } from "@/app/adapters/database";
import { keycloakConfiguration } from "@/app/adapters/auth";
import { logFailure } from "@/app/core/errors";
import { chatRuntime } from "@/app/adapters/chat";

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
          await database().query(
            "SELECT id, project_id, owner_id, submission_id, position, prompt, response_text, response_document, status, progress, error_code, cancel_requested, worker_id, sandbox_name, heartbeat_at, context_snapshot, created_at, updated_at, started_at, finished_at FROM agent_turns LIMIT 0",
          );
          await database().query(
            "SELECT worker_id, status, detail, heartbeat_at FROM agent_workers LIMIT 0",
          );
        },
      },
      {
        name: "Analysis storage",
        check: async () => {
          await database().query(
            "SELECT requested_action FROM agent_turns LIMIT 0",
          );
          await database().query("SELECT id,result FROM analysis_runs LIMIT 0");
          await database().query(
            "SELECT submission_id,note FROM analysis_reviews LIMIT 0",
          );
          await database().query(
            "SELECT dataset_id FROM project_datasets LIMIT 0",
          );
        },
      },
      {
        name: "Marker reference",
        check: async () => {
          await new PublishedMarkerReference().health();
          await database().query(
            "SELECT id, project_id, owner_id, turn_id, marker_entry_id, result FROM marker_evidence_runs LIMIT 0",
          );
          await database().query(
            "SELECT evidence_run_id FROM research_entries LIMIT 0",
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
async function agentHealth(): Promise<ServiceHealth> {
  try {
    const runtime = await chatRuntime();
    return { name: "Agent worker", ...runtime };
  } catch (error) {
    logFailure("health.agent_worker", error);
    return {
      name: "Agent worker",
      status: "unavailable",
      detail: "Agent worker status could not be verified.",
    };
  }
}
const scientific = new LocalScientificData();
async function researchHealth(): Promise<ServiceHealth[]> {
  return Promise.all(
    [
      {
        name: "Scientific dataset",
        check: async () => {
          const h = await scientific.health();
          return `${h.datasetCount} verified dataset · local sparse CPU analysis`;
        },
      },
      {
        name: "Literature evidence",
        check: async () => {
          const h = await new CuratedLiterature().health();
          return `${h.sources} curated sources · ${h.passages} passages · lexical search`;
        },
      },
    ].map(async ({ name, check }): Promise<ServiceHealth> => {
      try {
        return { name, status: "ready", detail: await check() };
      } catch {
        return {
          name,
          status: "unavailable",
          detail: "Source verification or configuration is required.",
        };
      }
    }),
  );
}
export async function serviceHealth(): Promise<ServiceHealth[]> {
  return [
    ...(await foundationHealth()),
    await agentHealth(),
    ...(await researchHealth()),
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
