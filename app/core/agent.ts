import type { AnnotationResult } from "./types";
import type { PlantContext } from "./plants";

export interface AnnotationRequest {
  projectId: string;
  genes: string[];
  // Optional only for compatibility with the existing unavailable endpoint.
  // A future analytical implementation must require the context its tools need.
  context?: PlantContext;
}
export interface Agent {
  run(userId: string, request: AnnotationRequest): Promise<AnnotationResult>;
}
