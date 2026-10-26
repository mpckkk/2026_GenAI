import { readFile } from "node:fs/promises";
import path from "node:path";
import { LocalScientificData } from "../adapters/scientific-data.mjs";
import { CuratedLiterature } from "../adapters/literature.mjs";
import { MarkerAnnotationEngine } from "../adapters/annotation-engine.mjs";
import "server-only";
import {
  configuredReferences,
  ZetarisReference,
} from "../adapters/zetaris-reference.mjs";
import { database } from "@/app/adapters/database";
import { keycloakConfiguration } from "@/app/adapters/auth";
import { logFailure } from "@/app/core/errors";
import { chatRuntime } from "@/app/adapters/chat";
import { ResearchMemory } from "../adapters/research-memory.mjs";

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
            "SELECT id,receipt,sha256 FROM marker_imports LIMIT 0",
          );
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
          await database().query(
            "SELECT submission_id,cluster,cell_type FROM annotation_reviews LIMIT 0",
          );
        },
      },
      {
        name: "Marker reference",
        check: async () => {
          await configuredReferences().marker.health();
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
        name: "H-MEM",
        check: async () => {
          await new ResearchMemory().health(database());
          return "Saved researcher decisions · project-scoped recall · PostgreSQL trust ledger";
        },
      },
      {
        name: "Cell-type annotation",
        check: async () => {
          const h = await new MarkerAnnotationEngine({
            scientificData: scientific,
            loadReference: configuredReferences().load,
          }).health();
          return `${h.reference.markerGeneCount} verified marker genes · ${h.reference.cellTypeCount} root identities · researcher review required`;
        },
      },
      {
        name: "Scientific dataset",
        check: async () => {
          const h = await scientific.health();
          return `${h.datasetCount} verified dataset · local sparse CPU analysis`;
        },
      },
      {
        name: "H5AD imports",
        check: async () => {
          if (!process.env.CELLORAS_UPLOAD_DIR)
            throw new Error("uploads_unconfigured");
          await database().query(
            "SELECT id,status,manifest_sha256 FROM dataset_uploads LIMIT 0",
          );
          const heartbeat = JSON.parse(
            await readFile(
              path.join(
                /* turbopackIgnore: true */ process.env.CELLORAS_UPLOAD_DIR,
                ".worker-health.json",
              ),
              "utf8",
            ),
          );
          if (
            heartbeat.status !== "ready" ||
            typeof heartbeat.updatedAt !== "number" ||
            Math.abs(Date.now() / 1000 - heartbeat.updatedAt) > 45
          )
            throw new Error("import_worker_unavailable");
          return "Chunked H5AD uploads · validation and import worker connected";
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
const zetaris = new ZetarisReference();
async function sponsorHealth(): Promise<ServiceHealth[]> {
  let data: ServiceHealth = {
    name: "Zetaris",
    status: "pending",
    detail:
      "Connect a Zetaris workspace and select it as the marker-reference provider.",
  };
  if (process.env.CELLORAS_REFERENCE_PROVIDER === "zetaris") {
    try {
      const receipt = await zetaris.health();
      data = {
        name: "Zetaris",
        status: "ready",
        detail: `${receipt.recordCount} reference associations queried and hash-verified`,
      };
    } catch {
      data = {
        name: "Zetaris",
        status: "unavailable",
        detail:
          "Reference query failed. Check workspace access, table import and source version.",
      };
    }
  }
  let nightshift: ServiceHealth = {
    name: "Meterless Nightshift",
    status: "pending",
    detail:
      "Connect a Nightshift runtime and select its model route. OpenShell remains the default.",
  };
  let nemotron: ServiceHealth = {
    name: "Nemotron",
    status: "pending",
    detail:
      "No completed model call has verified a Nemotron route in the active runtime.",
  };
  if (process.env.CELLORAS_AGENT_RUNTIME === "nightshift") {
    try {
      const worker = await database().query<{ detail: string }>(
        "SELECT detail FROM agent_workers WHERE status='ready' AND detail LIKE 'Meterless Nightshift connected%' AND heartbeat_at > clock_timestamp()-interval '30 seconds' ORDER BY heartbeat_at DESC LIMIT 1",
      );
      nightshift = worker.rowCount
        ? {
            name: "Meterless Nightshift",
            status: "ready",
            detail: worker.rows[0].detail,
          }
        : {
            name: "Meterless Nightshift",
            status: "unavailable",
            detail:
              "Worker cannot verify the configured runtime and model route.",
          };
      if (worker.rows[0]?.detail.toLowerCase().includes("nemotron"))
        nemotron = {
          name: "Nemotron",
          status: "ready",
          detail:
            "The active runtime reported a Nemotron model on a completed response.",
        };
    } catch {
      nightshift = {
        name: "Meterless Nightshift",
        status: "unavailable",
        detail: "Worker status could not be verified.",
      };
    }
  }
  return [data, nightshift, nemotron];
}
export async function serviceHealth(): Promise<ServiceHealth[]> {
  return [
    ...(await foundationHealth()),
    await agentHealth(),
    ...(await researchHealth()),
    ...(await sponsorHealth()),
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
