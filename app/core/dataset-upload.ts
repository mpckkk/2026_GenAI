export const datasetUploadLimits = {
  chunkSize: 8 * 1024 * 1024,
  maxBytes: 4 * 1024 * 1024 * 1024,
};
export class DatasetUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly offset?: number,
  ) {
    super(message);
    this.name = "DatasetUploadError";
  }
}
export interface DatasetUploadSelection {
  matrix: string;
  geneColumn: string;
  groupColumn: string;
  embedding: string;
  genomeBuild: string;
  tissue: string;
  speciesId: "glycine-max";
  rawCountsConfirmed: true;
}
export const uploadUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
