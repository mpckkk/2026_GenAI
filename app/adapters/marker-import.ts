import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type {
  MarkerImportReceipt,
  MarkerImportRepository,
  ValidatedMarkerImport,
} from "../core/marker-import";
import { ProjectNotFoundError, ResearchConflictError } from "../core/errors";
import { database } from "./database";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export class PostgresMarkerImports implements MarkerImportRepository {
  async save(
    userId: string,
    projectId: string,
    input: ValidatedMarkerImport,
  ): Promise<MarkerImportReceipt> {
    const client = await database().connect();
    let failedRollback = false;
    try {
      await client.query("BEGIN");
      const owner = await client.query(
        "SELECT id FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [projectId, userId],
      );
      if (!owner.rows.length) throw new ProjectNotFoundError();
      const existing = await client.query(
        "SELECT fingerprint,receipt FROM marker_imports WHERE project_id=$1 AND owner_id=$2 AND submission_id=$3",
        [projectId, userId, input.submissionId],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].fingerprint !== input.fingerprint)
          throw new ResearchConflictError();
        await client.query("COMMIT");
        return existing.rows[0].receipt;
      }
      const id = randomUUID(),
        contextId = randomUUID();
      const contextPayload = { kind: "context", context: input.context };
      await client.query(
        "INSERT INTO research_entries(id,project_id,author_id,submission_id,fingerprint,kind,payload) VALUES($1,$2,$3,$4,$5,'context',$6::jsonb)",
        [
          contextId,
          projectId,
          userId,
          randomUUID(),
          digest(contextPayload),
          JSON.stringify(contextPayload),
        ],
      );
      const groups: MarkerImportReceipt["groups"] = [];
      for (const group of input.groups) {
        const entryId = randomUUID();
        const payload = {
          kind: "markers",
          speciesId: input.context.speciesId,
          label: group.label,
          markersRaw: group.genes.join("\n"),
          genes: group.genes,
          contextEntryId: contextId,
          context: input.context,
          source: {
            importId: id,
            fileName: input.fileName,
            sha256: input.sha256,
          },
        };
        await client.query(
          "INSERT INTO research_entries(id,project_id,author_id,submission_id,fingerprint,kind,payload,reference_entry_id) VALUES($1,$2,$3,$4,$5,'markers',$6::jsonb,$7)",
          [
            entryId,
            projectId,
            userId,
            randomUUID(),
            digest(payload),
            JSON.stringify(payload),
            contextId,
          ],
        );
        groups.push({
          entryId,
          label: group.label,
          geneCount: group.genes.length,
        });
      }
      const receipt: MarkerImportReceipt = {
        id,
        fileName: input.fileName,
        sha256: input.sha256,
        createdAt: new Date().toISOString(),
        context: input.context,
        groups,
      };
      await client.query(
        "INSERT INTO marker_imports(id,project_id,owner_id,submission_id,fingerprint,sha256,file_name,original_csv,receipt) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)",
        [
          id,
          projectId,
          userId,
          input.submissionId,
          input.fingerprint,
          input.sha256,
          input.fileName,
          input.csv,
          JSON.stringify(receipt),
        ],
      );
      await client.query("COMMIT");
      return receipt;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        failedRollback = true;
      }
      throw error;
    } finally {
      client.release(failedRollback);
    }
  }
  async list(
    userId: string,
    projectId: string,
  ): Promise<MarkerImportReceipt[]> {
    const result = await database().query(
      "SELECT i.receipt FROM marker_imports i JOIN projects p ON p.id=i.project_id WHERE p.id=$1 AND p.owner_id=$2 AND i.owner_id=$2 ORDER BY i.created_at DESC LIMIT 20",
      [projectId, userId],
    );
    return result.rows.map((row) => row.receipt);
  }
  async download(userId: string, projectId: string, importId: string) {
    const result = await database().query(
      "SELECT i.original_csv,i.file_name FROM marker_imports i JOIN projects p ON p.id=i.project_id WHERE p.id=$1 AND p.owner_id=$2 AND i.owner_id=$2 AND i.id=$3",
      [projectId, userId, importId],
    );
    if (!result.rows[0]) throw new ProjectNotFoundError();
    return {
      csv: result.rows[0].original_csv as string,
      fileName: result.rows[0].file_name as string,
    };
  }
}
