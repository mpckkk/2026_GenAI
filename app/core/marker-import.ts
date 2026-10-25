import type { PlantContext } from "./plants";

export const markerImportLimits = {
  bytes: 262144,
  rows: 4000,
  groups: 20,
  genesPerGroup: 200,
} as const;

export interface MarkerColumns {
  group: string;
  gene: string;
}
export interface ImportedMarkerGroup {
  label: string;
  genes: string[];
  rows: number;
}
export interface MarkerImportInput {
  submissionId: string;
  fileName: string;
  csv: string;
  columns: MarkerColumns;
  context: PlantContext;
}
export interface MarkerImportReceipt {
  id: string;
  fileName: string;
  sha256: string;
  createdAt: string;
  context: PlantContext;
  groups: { entryId: string; label: string; geneCount: number }[];
}
export interface ValidatedMarkerImport extends MarkerImportInput {
  fingerprint: string;
  sha256: string;
  groups: ImportedMarkerGroup[];
}
export interface MarkerImportRepository {
  save(
    userId: string,
    projectId: string,
    input: ValidatedMarkerImport,
  ): Promise<MarkerImportReceipt>;
  list(userId: string, projectId: string): Promise<MarkerImportReceipt[]>;
  download(
    userId: string,
    projectId: string,
    importId: string,
  ): Promise<{ csv: string; fileName: string }>;
}
