export interface MemoryDecision {
  id: string;
  source: string;
  href: string;
  savedAt: string;
  content: string;
  relevance: number;
}
export interface MemoryRecall {
  engine: string;
  commit: string;
  note: string;
  decisions: MemoryDecision[];
  trace: {
    retrievalReason: string;
    strategy: string;
    scores: Record<string, number>;
    selection?: "explicit_group" | "hybrid";
    eligibleDecisions?: number;
  };
}
export interface MemoryRequest {
  ownerId: string;
  projectId: string;
  turnId: string;
  query: string;
}
