import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PlantCatalog, PlantContext } from "@/app/core/plants";
import type {
  AppendResearchInput,
  MarkerEntry,
  ResearchCommand,
  ResearchEntry,
  ResearchPayload,
  ResearchRepository,
  ResearchWorkspace,
} from "@/app/core/research";
import { ResearchValidationError, logFailure } from "@/app/core/errors";
import type { AccessService } from "./access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POSITION = "9223372036854775807";

function invalid(field: string, message: string): never {
  throw new ResearchValidationError({ [field]: message });
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(field, "Provide a valid research entry.");
  return value as Record<string, unknown>;
}

function onlyKeys(
  value: Record<string, unknown>,
  keys: string[],
  field: string,
) {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    invalid(field, "This entry contains unsupported fields.");
}

function string(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") invalid(field, "Enter text for this field.");
  if (value.length > max) invalid(field, `Use at most ${max} characters.`);
  if (/\0|[\uD800-\uDFFF]/u.test(value))
    invalid(field, "Remove invalid text characters.");
  return value;
}

function requiredText(value: unknown, field: string, max: number): string {
  const result = string(value, field, max);
  if (!result.trim()) invalid(field, "This field is required.");
  return result;
}

function optionalText(
  value: unknown,
  field: string,
  max: number,
): string | null {
  if (value === null || value === undefined) return null;
  return string(value, field, max).trim() || null;
}

function note(value: unknown, field: string, max: number): string {
  if (value === null || value === undefined) return "";
  return string(value, field, max);
}

function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value))
    invalid(field, "Use a valid entry identifier.");
  return value.toLowerCase();
}

function species(value: unknown, catalog: PlantCatalog): string {
  const id = requiredText(value, "speciesId", 120).trim();
  if (!catalog.find(id))
    invalid("speciesId", "Choose a supported plant species.");
  return id;
}

function context(value: unknown, catalog: PlantCatalog): PlantContext {
  const input = object(value, "context");
  onlyKeys(
    input,
    [
      "speciesId",
      "tissue",
      "sampleLabel",
      "developmentalStage",
      "genomeVersion",
      "geneIdNamespace",
      "notes",
    ],
    "context",
  );
  return {
    speciesId: species(input.speciesId, catalog),
    tissue: optionalText(input.tissue, "tissue", 120),
    sampleLabel: optionalText(input.sampleLabel, "sampleLabel", 120),
    developmentalStage: optionalText(
      input.developmentalStage,
      "developmentalStage",
      120,
    ),
    genomeVersion: optionalText(input.genomeVersion, "genomeVersion", 120),
    geneIdNamespace: optionalText(
      input.geneIdNamespace,
      "geneIdNamespace",
      120,
    ),
    notes: note(input.notes, "notes", 5000),
  };
}

function parse(input: unknown, catalog: PlantCatalog): AppendResearchInput {
  const envelope = object(input, "entry");
  onlyKeys(envelope, ["submissionId", "command"], "entry");
  const submissionId = uuid(envelope.submissionId, "submissionId");
  const command = object(envelope.command, "command");
  let parsed: ResearchCommand;
  switch (command.kind) {
    case "message":
      onlyKeys(command, ["kind", "text"], "command");
      parsed = {
        kind: "message",
        text: requiredText(command.text, "text", 10000),
      };
      break;
    case "context":
      onlyKeys(command, ["kind", "context"], "command");
      parsed = { kind: "context", context: context(command.context, catalog) };
      break;
    case "markers":
      onlyKeys(
        command,
        ["kind", "speciesId", "label", "markersRaw", "contextEntryId"],
        "command",
      );
      parsed = {
        kind: "markers",
        speciesId: species(command.speciesId, catalog),
        label: optionalText(command.label, "label", 120),
        markersRaw: requiredText(command.markersRaw, "markersRaw", 20000),
        contextEntryId:
          command.contextEntryId === null ||
          command.contextEntryId === undefined
            ? null
            : uuid(command.contextEntryId, "contextEntryId"),
      };
      break;
    case "manual_review":
      onlyKeys(
        command,
        ["kind", "markerEntryId", "cellType", "evidenceText", "notes"],
        "command",
      );
      parsed = {
        kind: "manual_review",
        markerEntryId: uuid(command.markerEntryId, "markerEntryId"),
        cellType: optionalText(command.cellType, "cellType", 120),
        evidenceText: note(command.evidenceText, "evidenceText", 5000),
        notes: note(command.notes, "notes", 10000),
      };
      if (
        !parsed.cellType &&
        !parsed.evidenceText.trim() &&
        !parsed.notes.trim()
      )
        invalid(
          "cellType",
          "Add a cell-type decision, evidence or a review note.",
        );
      break;
    default:
      invalid("kind", "Choose a supported research entry type.");
  }
  return { submissionId, command: parsed };
}

function cursor(before?: string) {
  if (before === undefined) return;
  if (
    !/^[1-9][0-9]{0,18}$/.test(before) ||
    before.length > MAX_POSITION.length ||
    (before.length === MAX_POSITION.length && before > MAX_POSITION)
  )
    invalid("before", "Use a valid conversation page cursor.");
}

function genes(raw: string): string[] {
  const values = [...new Set(raw.split(/[\s,;]+/u).filter(Boolean))];
  if (!values.length || values.length > 200)
    invalid("markersRaw", "Provide between 1 and 200 distinct marker genes.");
  if (values.some((gene) => gene.length > 100))
    invalid(
      "markersRaw",
      "Each marker identifier must contain at most 100 characters.",
    );
  return values;
}

function stage(
  operationId: string,
  event: string,
  detail: Record<string, string | number> = {},
) {
  // Deliberately exclude researcher text, marker identifiers and credentials.
  console.info(
    JSON.stringify({ event: `research.${event}`, operationId, ...detail }),
  );
}

export class ResearchService {
  constructor(
    private readonly access: AccessService,
    private readonly repository: ResearchRepository,
    private readonly plants: PlantCatalog,
  ) {}

  async workspace(
    userId: string,
    projectId: string,
    before?: string,
  ): Promise<ResearchWorkspace> {
    const operationId = randomUUID();
    stage(operationId, "workspace.started");
    try {
      await this.access.requireProject(userId, projectId);
      cursor(before);
      const [page, latestContext, recentMarkers] = await Promise.all([
        this.repository.list(userId, projectId, before),
        this.repository.latestContext(userId, projectId),
        this.repository.listMarkers(userId, projectId),
      ]);
      // Keep older visible clusters reviewable without loading the full history.
      // Each page entry contributes at most one marker or review reference.
      const markerById = new Map<string, MarkerEntry>(
        recentMarkers.map((marker) => [marker.id, marker]),
      );
      const requiredMarkerIds = new Set<string>();
      for (const item of page.entries) {
        if (item.kind === "markers") markerById.set(item.id, item);
        else if (item.kind === "manual_review")
          requiredMarkerIds.add(item.markerEntryId);
      }
      const missingMarkers = await Promise.all(
        [...requiredMarkerIds]
          .filter((id) => !markerById.has(id))
          .map((id) => this.repository.findOwned(userId, projectId, id)),
      );
      for (const marker of missingMarkers) {
        if (marker?.kind !== "markers")
          throw new Error(
            "Stored research review has an invalid marker reference",
          );
        markerById.set(marker.id, marker);
      }
      const markers = [...markerById.values()].sort((left, right) => {
        const leftPosition = BigInt(left.position);
        const rightPosition = BigInt(right.position);
        return leftPosition > rightPosition
          ? -1
          : leftPosition < rightPosition
            ? 1
            : 0;
      });
      stage(operationId, "workspace.loaded", { entries: page.entries.length });
      return { page, context: latestContext, markers };
    } catch (error) {
      logFailure(`research.workspace.failed.${operationId}`, error);
      throw error;
    }
  }

  async append(
    userId: string,
    projectId: string,
    input: unknown,
  ): Promise<ResearchEntry> {
    const operationId = randomUUID();
    stage(operationId, "append.started");
    try {
      await this.access.requireProject(userId, projectId);
      const parsed = parse(input, this.plants);
      const { command } = parsed;
      stage(operationId, "append.validated", { kind: command.kind });
      let payload: ResearchPayload;
      if (command.kind === "markers") {
        const normalizedGenes = genes(command.markersRaw);
        let snapshot: PlantContext | null = null;
        if (command.contextEntryId) {
          const reference = await this.repository.findOwned(
            userId,
            projectId,
            command.contextEntryId,
          );
          if (
            reference?.kind !== "context" ||
            reference.context.speciesId !== command.speciesId
          )
            invalid(
              "contextEntryId",
              "Choose a context for this species in this experiment.",
            );
          snapshot = reference.context;
        }
        payload = { ...command, genes: normalizedGenes, context: snapshot };
      } else {
        if (command.kind === "manual_review") {
          const reference = await this.repository.findOwned(
            userId,
            projectId,
            command.markerEntryId,
          );
          if (reference?.kind !== "markers")
            invalid("markerEntryId", "Choose a marker set in this experiment.");
        }
        payload = command;
      }
      stage(operationId, "append.references_resolved", { kind: command.kind });
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(command))
        .digest("hex");
      const entry = await this.repository.append(userId, projectId, {
        submissionId: parsed.submissionId,
        fingerprint,
        payload,
      });
      stage(operationId, "append.committed", {
        kind: entry.kind,
        position: entry.position,
      });
      return entry;
    } catch (error) {
      logFailure(`research.append.failed.${operationId}`, error);
      throw error;
    }
  }
}
