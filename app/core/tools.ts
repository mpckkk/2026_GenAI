import type { AnnotationResult, Evidence, JsonValue } from "./types";

export interface MarkerData {
  findEvidence(projectId: string, genes: string[]): Promise<Evidence[]>;
}
export interface Memory {
  recall(projectId: string, query: string): Promise<JsonValue[]>;
  remember(projectId: string, value: JsonValue): Promise<void>;
}
export interface ModelGateway {
  annotate(genes: string[], evidence: Evidence[]): Promise<AnnotationResult>;
}
export interface Assets {
  read(projectId: string, assetId: string): Promise<ReadableStream<Uint8Array>>;
  write(projectId: string, name: string, content: Uint8Array): Promise<string>;
}
