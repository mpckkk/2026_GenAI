import type { ChatStatus } from "./chat";

export type ActivityKind =
  | "queue"
  | "context"
  | "memory"
  | "model"
  | "tool"
  | "reference"
  | "response"
  | "cleanup";
export type ActivityPhase =
  "started" | "completed" | "failed" | "cancelled" | "info";
/** Deliberately excludes raw model/provider payloads, credentials and hidden reasoning. */
export interface ActivityData {
  provider?: string;
  datasetId?: string;
  artifactVersion?: string;
  operation?: string;
  cluster?: string;
  genes?: string[];
  resultId?: string;
  reference?: {
    provider?: string;
    requestId?: string;
    retrievedAt?: string;
    recordCount?: number;
    contentSha256?: string;
  };
  runtime?: string;
  model?: string;
  inputBytes?: number;
  contextCounts?: {
    turns?: number;
    researchEntries?: number;
    analysisRuns?: number;
    markers?: number;
  };
  outputCounts?: {
    blocks?: number;
    characters?: number;
    results?: number;
    clusters?: number;
    suggested?: number;
    ambiguous?: number;
    unresolved?: number;
  };
  sourceIds?: string[];
  memoryCount?: number;
  errorCode?: string;
  decision?: string;
  durationMs?: number;
}
export interface ActivityEvent {
  id: string;
  position: string;
  spanId: string;
  parentSpanId: string | null;
  kind: ActivityKind;
  phase: ActivityPhase;
  name: string;
  summary: string;
  data: ActivityData;
  createdAt: string;
  /** Derived from a terminal turn and missing terminal span event, never a fabricated event. */
  interrupted: boolean;
  durationMs: number | null;
}
export interface ActivityRunSummary {
  id: string;
  projectId: string;
  projectName: string;
  position: string;
  prompt: string;
  status: ChatStatus;
  errorCode: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  runtime: string | null;
  model: string | null;
  durationMs: number | null;
  toolCount: number;
  recordingVersion: number | null;
}
export interface ActivityRunDetail {
  run: ActivityRunSummary;
  events: ActivityEvent[];
  response: { text: string; href: string } | null;
  results: Array<{
    id: string;
    operation: string;
    title: string;
    summary: string;
    href: string;
    createdAt: string;
  }>;
  memory: Array<{
    source: string;
    href: string;
    savedAt: string;
    content: string;
  }>;
  dataset: { id: string; artifactVersion: string; name?: string } | null;
}
export interface ActivityList {
  runs: ActivityRunSummary[];
  nextBefore: string | null;
  projects: Array<{ id: string; name: string }>;
  summary: { total: number; completed: number; failed: number; active: number };
}
export interface ActivityFilters {
  projectId?: string;
  status?: ChatStatus | "active";
  q?: string;
  before?: string;
  limit?: number;
}
export interface ActivityRepository {
  list(userId: string, filters: ActivityFilters): Promise<ActivityList>;
  ownedProjectId(userId: string, turnId: string): Promise<string>;
  detail(
    userId: string,
    projectId: string,
    turnId: string,
  ): Promise<ActivityRunDetail>;
}
