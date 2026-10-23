import type { PlantContext } from "./plants";

export type ResearchCommand =
  | { kind: "message"; text: string }
  | { kind: "context"; context: PlantContext }
  | {
      kind: "markers";
      speciesId: string;
      label: string | null;
      markersRaw: string;
      contextEntryId: string | null;
    }
  | {
      kind: "manual_review";
      markerEntryId: string;
      cellType: string | null;
      evidenceText: string;
      notes: string;
    };

export interface AppendResearchInput {
  submissionId: string;
  command: ResearchCommand;
}

export type ResearchPayload =
  | Exclude<ResearchCommand, { kind: "markers" }>
  | (Extract<ResearchCommand, { kind: "markers" }> & {
      genes: string[];
      context: PlantContext | null;
    });

export type ResearchEntry = ResearchPayload & {
  id: string;
  projectId: string;
  submissionId: string;
  position: string;
  actor: "researcher";
  createdAt: string;
};

export type ContextEntry = Extract<ResearchEntry, { kind: "context" }>;
export type MarkerEntry = Extract<ResearchEntry, { kind: "markers" }>;

export interface ResearchPage {
  entries: ResearchEntry[];
  nextBefore: string | null;
}

export interface ResearchRepository {
  list(
    userId: string,
    projectId: string,
    before?: string,
    limit?: number,
  ): Promise<ResearchPage>;
  findOwned(
    userId: string,
    projectId: string,
    entryId: string,
  ): Promise<ResearchEntry | null>;
  latestContext(
    userId: string,
    projectId: string,
  ): Promise<ContextEntry | null>;
  listMarkers(
    userId: string,
    projectId: string,
    limit?: number,
  ): Promise<MarkerEntry[]>;
  append(
    userId: string,
    projectId: string,
    input: {
      submissionId: string;
      fingerprint: string;
      payload: ResearchPayload;
    },
  ): Promise<ResearchEntry>;
}

export interface ResearchWorkspace {
  page: ResearchPage;
  context: ContextEntry | null;
  markers: MarkerEntry[];
}

export type ResearchActionState =
  | { status: "idle" }
  | { status: "saved"; entry: ResearchEntry }
  | {
      status: "error";
      message: string;
      fields?: Record<string, string>;
      code?: "SUBMISSION_CONFLICT";
    };
