import type { AnnotationResult, Evidence } from "./types";
import type { MemoryRecall, MemoryRequest } from "./memory";
import type { PlantContext } from "./plants";

export interface EvidenceQuery {
  projectId: string;
  context: PlantContext;
  genes: string[];
  referenceVersion: string | null;
}

export interface ModelAnnotationInput {
  context: PlantContext;
  genes: string[];
  evidence: Evidence[];
}

export interface MarkerData {
  findEvidence(query: EvidenceQuery): Promise<Evidence[]>;
}
export interface Memory {
  recall(input: MemoryRequest): Promise<MemoryRecall>;
}
export interface ModelGateway {
  annotate(input: ModelAnnotationInput): Promise<AnnotationResult>;
}
export interface Assets {
  read(projectId: string, assetId: string): Promise<ReadableStream<Uint8Array>>;
  write(projectId: string, name: string, content: Uint8Array): Promise<string>;
}
