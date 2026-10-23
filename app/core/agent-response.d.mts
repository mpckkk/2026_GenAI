import type {
  ScientificAction,
  ScientificRun,
  LiteratureRun,
  AnnotationRun,
} from "./analysis";
import type { MarkerEvidenceRun } from "./evidence";
import type { ContextEntry, MarkerEntry } from "./research";

export type MarkdownBlock = { type: "markdown"; text: string };
export type CardReference = {
  type:
    | "sample_context"
    | "marker_set"
    | "marker_evidence"
    | "scientific_result"
    | "literature_result"
    | "annotation_result"
    | "lookup_marker_evidence";
  entryId: string;
};
export type ScientificToolRequest = {
  type: "run_scientific_tool";
  datasetId: string;
  operation: ScientificAction["operation"];
  cluster: string | null;
  genes: string[];
  query: string | null;
};
export type AgentResponse = {
  version: 1;
  blocks: (MarkdownBlock | CardReference | ScientificToolRequest)[];
};
export type ResearchCardBlock =
  | { type: "sample_context"; entry: ContextEntry }
  | { type: "marker_set"; entry: MarkerEntry };
export type ResponseDocument = {
  version: 1;
  blocks: (
    | MarkdownBlock
    | ResearchCardBlock
    | { type: "marker_evidence"; result: MarkerEvidenceRun }
    | { type: "scientific_result"; result: ScientificRun }
    | { type: "literature_result"; result: LiteratureRun }
    | { type: "annotation_result"; result: AnnotationRun }
  )[];
};
export class AgentResponseError extends Error {
  code:
    | "agent_response_invalid"
    | "agent_card_unavailable"
    | "agent_tool_limit"
    | "cancelled";
}
export function parseAgentResponse(value: unknown): AgentResponse;
export function responseText(value: AgentResponse | ResponseDocument): string;
