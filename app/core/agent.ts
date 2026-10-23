import type { ChatTurn } from "./chat";

export interface AnnotationRequest {
  projectId: string;
  submissionId: string;
  datasetId: string;
  cluster?: string;
}
export interface Agent {
  run(userId: string, request: AnnotationRequest): Promise<ChatTurn>;
}
