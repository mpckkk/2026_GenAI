import type { AnnotationResult } from "./types";

export interface AnnotationRequest {
  projectId: string;
  genes: string[];
}
export interface Agent {
  run(userId: string, request: AnnotationRequest): Promise<AnnotationResult>;
}
