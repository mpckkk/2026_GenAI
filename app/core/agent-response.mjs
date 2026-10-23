import { parseScientificAction } from "./analysis.mjs";
export class AgentResponseError extends Error {
  constructor(code = "agent_response_invalid") {
    super(code);
    this.code = code;
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const objectWith = (value, keys) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

/** The model supplies references only. Card data never comes from inference. */
export function parseAgentResponse(value) {
  if (typeof value === "string") {
    if (value.length > 80000) throw new AgentResponseError();
    try {
      value = JSON.parse(value);
    } catch {
      throw new AgentResponseError();
    }
  }
  if (
    !objectWith(value, ["version", "blocks"]) ||
    value.version !== 1 ||
    !Array.isArray(value.blocks) ||
    value.blocks.length < 1 ||
    value.blocks.length > 12
  )
    throw new AgentResponseError();
  let length = 0;
  const references = new Set();
  let lookups = 0;
  for (const block of value.blocks) {
    if (block?.type === "markdown") {
      if (
        !objectWith(block, ["type", "text"]) ||
        typeof block.text !== "string" ||
        !block.text.trim() ||
        /\0|[\uD800-\uDFFF]/u.test(block.text)
      )
        throw new AgentResponseError();
      length += block.text.length;
    } else if (block?.type === "run_scientific_tool") {
      if (
        !objectWith(block, [
          "type",
          "datasetId",
          "operation",
          "cluster",
          "genes",
          "query",
        ])
      )
        throw new AgentResponseError();
      try {
        parseScientificAction({
          datasetId: block.datasetId,
          operation: block.operation,
          ...(block.cluster === null ? {} : { cluster: block.cluster }),
          genes: block.genes,
          ...(block.query === null ? {} : { query: block.query }),
        });
      } catch {
        throw new AgentResponseError();
      }
      lookups++;
    } else if (
      [
        "sample_context",
        "marker_set",
        "marker_evidence",
        "scientific_result",
        "literature_result",
        "annotation_result",
        "lookup_marker_evidence",
      ].includes(block?.type)
    ) {
      if (
        !objectWith(block, ["type", "entryId"]) ||
        typeof block.entryId !== "string" ||
        !uuid.test(block.entryId) ||
        references.has(block.entryId.toLowerCase())
      )
        throw new AgentResponseError();
      block.entryId = block.entryId.toLowerCase();
      references.add(block.entryId);
      if (block.type === "lookup_marker_evidence") lookups++;
    } else throw new AgentResponseError();
  }
  if (
    lookups > 1 ||
    (lookups &&
      value.blocks.some(
        (block) =>
          block.type !== "markdown" &&
          block.type !== "lookup_marker_evidence" &&
          block.type !== "run_scientific_tool",
      ))
  )
    throw new AgentResponseError();
  if (length < 1 || length > 64000) throw new AgentResponseError();
  return value;
}

export function responseText(response) {
  return response.blocks
    .filter((block) => block.type === "markdown")
    .map((block) => block.text)
    .join("\n\n");
}
