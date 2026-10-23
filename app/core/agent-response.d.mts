import type { ContextEntry, MarkerEntry } from "./research";

export type MarkdownBlock = { type: "markdown"; text: string };
export type CardReference = {
  type: "sample_context" | "marker_set";
  entryId: string;
};
export type AgentResponse = {
  version: 1;
  blocks: (MarkdownBlock | CardReference)[];
};
export type ResearchCardBlock =
  | { type: "sample_context"; entry: ContextEntry }
  | { type: "marker_set"; entry: MarkerEntry };
export type ResponseDocument = {
  version: 1;
  blocks: (MarkdownBlock | ResearchCardBlock)[];
};
export class AgentResponseError extends Error {
  code: "agent_response_invalid" | "agent_card_unavailable";
}
export function parseAgentResponse(value: unknown): AgentResponse;
export function responseText(value: AgentResponse | ResponseDocument): string;
