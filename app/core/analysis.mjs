export class AnalysisError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
/** Canonical bounded input, shared by HTTP admission and the worker broker. */
export function parseScientificAction(value) {
  if (
    !plain(value) ||
    Object.keys(value).some(
      (k) =>
        !["operation", "datasetId", "cluster", "genes", "query"].includes(k),
    ) ||
    ![
      "inspect",
      "markers",
      "expression",
      "dotplot",
      "literature",
      "annotation",
    ].includes(value.operation) ||
    typeof value.datasetId !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value.datasetId)
  )
    throw new AnalysisError("analysis_input_invalid");
  const result = { operation: value.operation, datasetId: value.datasetId };
  if (value.cluster !== undefined) {
    if (
      typeof value.cluster !== "string" ||
      !/^[A-Za-z0-9_.-]{1,64}$/.test(value.cluster)
    )
      throw new AnalysisError("analysis_input_invalid");
    result.cluster = value.cluster;
  }
  if (value.genes !== undefined) {
    if (
      !Array.isArray(value.genes) ||
      value.genes.length > 12 ||
      value.genes.some(
        (g) => typeof g !== "string" || !/^[A-Za-z0-9_.-]{1,100}$/.test(g),
      ) ||
      new Set(value.genes).size !== value.genes.length
    )
      throw new AnalysisError("analysis_input_invalid");
    result.genes = [...value.genes];
  }
  if (value.query !== undefined) {
    if (
      typeof value.query !== "string" ||
      !value.query.trim() ||
      value.query.length > 1000 ||
      /\0|[\uD800-\uDFFF]/u.test(value.query)
    )
      throw new AnalysisError("analysis_input_invalid");
    result.query = value.query.trim();
  }
  if (
    (result.operation === "markers" && !result.cluster) ||
    (result.operation === "expression" && result.genes?.length !== 1) ||
    (result.operation === "dotplot" && !result.genes?.length) ||
    (result.operation === "literature" && !result.query) ||
    (result.operation !== "literature" && result.query !== undefined) ||
    (!["markers", "annotation"].includes(result.operation) &&
      result.cluster !== undefined) ||
    (["inspect", "markers", "annotation"].includes(result.operation) &&
      result.genes?.length)
  )
    throw new AnalysisError("analysis_input_invalid");
  return result;
}
export function analysisCardType(operation) {
  if (operation === "literature") return "literature_result";
  if (operation === "annotation") return "annotation_result";
  return "scientific_result";
}
export function analysisRun(row, full = false) {
  const result = { ...row.result };
  if (!full) delete result.payload;
  return {
    id: row.id,
    projectId: row.project_id,
    turnId: row.turn_id,
    datasetId: row.dataset_id,
    createdAt: new Date(row.created_at).toISOString(),
    result,
  };
}
