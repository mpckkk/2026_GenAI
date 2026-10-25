import "server-only";
import { createHash } from "node:crypto";
import type {
  MarkerImportInput,
  MarkerImportRepository,
  MarkerColumns,
} from "../core/marker-import";
import type { PlantCatalog } from "../core/plants";
import { ResearchValidationError } from "../core/errors";
import { readMarkerCsv, groupMarkerCsv } from "../adapters/marker-csv";
import { parseResearchInput } from "./research";
import type { AccessService } from "./access";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class MarkerImportService {
  constructor(
    private access: AccessService,
    private repository: MarkerImportRepository,
    private plants: PlantCatalog,
  ) {}
  async save(userId: string, projectId: string, value: unknown) {
    await this.access.requireProject(userId, projectId);
    const invalid = (message: string): never => {
      throw new ResearchValidationError({ file: message });
    };
    if (!value || typeof value !== "object" || Array.isArray(value))
      invalid("Choose a CSV to import.");
    const input = value as MarkerImportInput;
    if (
      Object.keys(input).some(
        (k) =>
          !["submissionId", "fileName", "csv", "columns", "context"].includes(
            k,
          ),
      )
    )
      invalid("The import contains unsupported fields.");
    if (!uuid.test(input.submissionId)) invalid("Use a valid submission ID.");
    if (
      typeof input.fileName !== "string" ||
      !/\.csv$/i.test(input.fileName) ||
      input.fileName.length > 180 ||
      /[/\\\x00-\x1f\x7f]/.test(input.fileName)
    )
      invalid("Choose a CSV file with a valid file name.");
    if (typeof input.csv !== "string") invalid("CSV contents are required.");
    const columns = input.columns as MarkerColumns | undefined;
    if (
      !columns ||
      typeof columns !== "object" ||
      Object.keys(columns).some((k) => !["group", "gene"].includes(k)) ||
      typeof columns.group !== "string" ||
      typeof columns.gene !== "string"
    )
      invalid("Choose the group and gene columns.");
    const parsed = parseResearchInput(
      {
        submissionId: input.submissionId,
        command: { kind: "context", context: input.context },
      },
      this.plants,
    );
    if (parsed.command.kind !== "context")
      throw new ResearchValidationError({
        file: "Sample context is required.",
      });
    let groups;
    try {
      groups = groupMarkerCsv(readMarkerCsv(input.csv), columns!);
    } catch (error) {
      invalid(error instanceof Error ? error.message : "Check the marker CSV.");
    }
    const canonical = {
      submissionId: input.submissionId.toLowerCase(),
      fileName: input.fileName,
      csv: input.csv,
      columns: columns!,
      context: parsed.command.context,
    };
    const sha256 = createHash("sha256").update(input.csv, "utf8").digest("hex");
    return this.repository.save(userId, projectId, {
      ...canonical,
      sha256,
      groups: groups!,
      fingerprint: createHash("sha256")
        .update(JSON.stringify(canonical))
        .digest("hex"),
    });
  }
  async list(userId: string, projectId: string) {
    await this.access.requireProject(userId, projectId);
    return this.repository.list(userId, projectId);
  }
  async download(userId: string, projectId: string, importId: string) {
    await this.access.requireProject(userId, projectId);
    if (!uuid.test(importId))
      throw new ResearchValidationError({ file: "Choose a saved import." });
    return this.repository.download(userId, projectId, importId);
  }
}
