import {
  AnalysisError,
  parseScientificAction,
  analysisRun,
} from "../core/analysis.mjs";

/** No model-supplied evidence: execute against the attached, verified immutable dataset. */
export async function runAnalysis(
  connection,
  scientific,
  literature,
  { projectId, ownerId, turnId, action, step, signal },
) {
  const input = parseScientificAction(action);
  if (signal?.aborted) throw new AnalysisError("cancelled");
  const owned = await connection.query(
    `SELECT d.dataset_id,d.artifact_version FROM project_datasets d
    JOIN projects p ON p.id=d.project_id JOIN agent_turns t ON t.project_id=p.id
    WHERE p.id=$1 AND p.owner_id=$2 AND t.owner_id=$2 AND t.id=$3
      AND t.status='running' AND NOT t.cancel_requested`,
    [projectId, ownerId, turnId],
  );
  const binding = owned.rows[0];
  if (!binding || binding.dataset_id !== input.datasetId)
    throw new AnalysisError("analysis_unavailable");
  const dataset = (await scientific.catalog()).find(
    (d) =>
      d.id === binding.dataset_id &&
      d.artifactVersion === binding.artifact_version,
  );
  if (!dataset) throw new AnalysisError("scientific_data_unavailable");
  const result =
    input.operation === "literature"
      ? await literature.search({
          query: input.query,
          speciesId: dataset.speciesId,
          tissue: dataset.tissue,
          genomeVersion: dataset.genomeBuild,
          genes: input.genes,
          limit: 6,
        })
      : await scientific.run({ ...input, signal });
  if (signal?.aborted) throw new AnalysisError("cancelled");
  const saved = await connection.query(
    `INSERT INTO analysis_runs(project_id,owner_id,turn_id,dataset_id,artifact_version,step,operation,input,result)
    SELECT p.id,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb FROM projects p
    JOIN agent_turns t ON t.project_id=p.id JOIN project_datasets d ON d.project_id=p.id
    WHERE p.id=$1 AND p.owner_id=$2 AND t.id=$3 AND t.owner_id=$2 AND t.status='running' AND NOT t.cancel_requested
      AND d.dataset_id=$4 AND d.artifact_version=$5 RETURNING *`,
    [
      projectId,
      ownerId,
      turnId,
      input.datasetId,
      dataset.artifactVersion,
      step,
      input.operation,
      JSON.stringify(input),
      JSON.stringify(result),
    ],
  );
  if (!saved.rows[0]) throw new AnalysisError("cancelled");
  return analysisRun(saved.rows[0]);
}
