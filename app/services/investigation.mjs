import { createHash } from "node:crypto";
import { AnalysisError } from "../core/analysis.mjs";

const sha = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const genesOf = (candidate) => [
  ...candidate.supportingGenes,
  ...candidate.conflictingGenes,
  ...candidate.uninformativeGenes,
];
const fail = (code) => {
  throw new AnalysisError(code);
};

/** Evidence preparation is independent of the LLM and can be verified against real counts. */
export async function prepareInvestigation({
  source,
  clusterId,
  scientific,
  signal,
}) {
  const group = source.result.payload.clusters.find(
    (c) => c.cluster === clusterId,
  );
  if (!group || group.status === "suggested")
    fail("investigation_group_not_unclear");
  const candidates = group.candidates.slice(0, 2);
  if (candidates.length !== 2) fail("investigation_insufficient_candidates");
  const allGenes = candidates.map(genesOf);
  const selected = allGenes.map((rows, i) =>
    rows
      .filter(
        (gene) =>
          !allGenes[1 - i].some((other) => other.geneId === gene.geneId),
      )
      .sort(
        (a, b) =>
          Number(b.assessment === "supports") -
            Number(a.assessment === "supports") ||
          b.zScore - a.zScore ||
          a.geneId.localeCompare(b.geneId),
      )
      .slice(0, 2),
  );
  if (selected.some((rows) => !rows.length))
    fail("investigation_no_distinguishing_markers");
  const genes = selected.flat().map((g) => g.geneId);
  const pointsByGene = new Map();
  let cells;
  for (const gene of genes) {
    const result = await scientific.run({
      datasetId: source.result.dataset.id,
      operation: "expression",
      genes: [gene],
      signal,
    });
    if (
      result.operation !== "expression" ||
      result.dataset.artifactVersion !==
        source.result.dataset.artifactVersion ||
      result.dataset.source.sha256 !== source.result.dataset.source.sha256 ||
      result.payload.gene.geneId !== gene
    )
      fail("investigation_dataset_changed");
    const points = result.payload.embedding.points.filter(
      (p) => p.cluster === clusterId,
    );
    if (
      points.length !== group.nCells ||
      new Set(points.map((p) => p.cellId)).size !== group.nCells ||
      points.some((p) => !Number.isSafeInteger(p.rawCount) || p.rawCount < 0)
    )
      fail("investigation_invalid_measurements");
    const values = new Map(points.map((p) => [p.cellId, p.rawCount > 0]));
    if (cells && cells.some((cell) => !values.has(cell)))
      fail("investigation_invalid_measurements");
    cells ??= [...values.keys()];
    pointsByGene.set(gene, values);
  }
  const check = {
    method:
      "Observed raw count greater than zero; any selected marker per candidate. Shared reference genes excluded. Descriptive co-detection only.",
    genes,
    total: group.nCells,
    firstOnly: 0,
    secondOnly: 0,
    both: 0,
    neither: 0,
    perGene: genes.map((geneId) => ({
      geneId,
      detected: cells.filter((cell) => pointsByGene.get(geneId).get(cell))
        .length,
    })),
  };
  for (const cell of cells) {
    const present = selected.map((rows) =>
      rows.some((g) => pointsByGene.get(g.geneId).get(cell)),
    );
    check[
      present[0]
        ? present[1]
          ? "both"
          : "firstOnly"
        : present[1]
          ? "secondOnly"
          : "neither"
    ]++;
  }
  const evidence = candidates.flatMap((candidate, i) =>
    allGenes[i].map((gene) => ({
      id: `marker:${i + 1}:${gene.geneId}`,
      kind: "marker",
      label: `${candidate.cellType}: ${gene.geneId}`,
      geneId: gene.geneId,
      sourceUrl: gene.sourceUrl,
      sourceRows: gene.sourceRows,
      sourceSpecies: gene.sourceSpecies,
      assessment: gene.assessment,
      detectionFraction: gene.detectionFraction,
      enrichment: gene.enrichment,
    })),
  );
  evidence.push({
    id: "measurement:co-detection",
    kind: "measurement",
    label: "Selected marker co-detection",
    details: `${check.total} nuclei: ${check.firstOnly} with candidate 1 markers only; ${check.secondOnly} with candidate 2 markers only; ${check.both} with both sets; ${check.neither} with neither set. ${check.method}`,
  });
  return {
    sourceRunId: source.id,
    datasetId: source.result.dataset.id,
    artifactVersion: source.result.dataset.artifactVersion,
    cluster: clusterId,
    nCells: group.nCells,
    species: source.result.dataset.species,
    tissue: source.result.dataset.tissue,
    genomeBuild: source.result.dataset.genomeBuild,
    before: {
      status: group.status,
      suggestedLabel: group.suggestedLabel,
      reason: group.reason,
    },
    candidates: candidates.map((c, i) => ({
      id: `candidate-${i + 1}`,
      cellType: c.cellType,
      score: c.score,
      selectedGenes: selected[i].map((g) => g.geneId),
    })),
    availableGenes: [...new Set(allGenes.flat().map((g) => g.geneId))],
    evidence,
    check,
  };
}

export async function runInvestigation({
  connection,
  scientific,
  referenceProvider,
  provider,
  activity,
  progress,
  projectId,
  ownerId,
  turnId,
  action,
  signal,
  parentSpanId,
}) {
  if (process.env.CELLORAS_INVESTIGATION_ENABLED !== "true")
    fail("investigation_unconfigured");
  const rows = await connection.query(
    `SELECT a.id,a.result FROM analysis_runs a JOIN projects p ON p.id=a.project_id
    JOIN agent_turns t ON t.id=a.turn_id JOIN project_datasets d ON d.project_id=p.id
    WHERE a.id=$3 AND a.project_id=$1 AND a.owner_id=$2 AND p.owner_id=$2 AND t.owner_id=$2 AND t.project_id=$1
      AND t.status='completed' AND NOT t.cancel_requested AND a.operation='annotation'
      AND d.dataset_id=a.dataset_id AND d.artifact_version=a.artifact_version AND a.dataset_id=$4`,
    [projectId, ownerId, action.annotationRunId, action.datasetId],
  );
  const source = rows.rows[0];
  if (!source) fail("investigation_source_unavailable");
  const reference = await activity.step(
    {
      kind: "reference",
      parentSpanId,
      name: "Check the investigation reference",
      summary:
        "Retrieve the published marker reference and confirm that it matches the saved annotation.",
      data: {
        provider: referenceProvider.name,
        cluster: action.cluster,
        resultId: source.id,
      },
    },
    () => referenceProvider.load({ signal }),
    (doc) => ({
      summary: `Retrieved ${doc.records.length} reference associations.`,
      data: {
        reference: doc.delivery ?? {
          provider: "Published reference",
          recordCount: doc.records.length,
          contentSha256: doc.contentSha256,
        },
      },
    }),
  );
  const originalReference = source.result.payload.reference;
  if (
    reference.reference.id !== originalReference.id ||
    reference.reference.version !== originalReference.version ||
    reference.reference.sha256 !== originalReference.sha256
  )
    fail("investigation_reference_changed");
  progress("Checking marker signals in individual nuclei");
  const packet = await activity.step(
    {
      kind: "tool",
      parentSpanId,
      name: "Check which marker signals occur together",
      summary:
        "Measure selected distinguishing markers in individual nuclei of this group.",
      data: {
        operation: "co_detection",
        cluster: action.cluster,
        datasetId: action.datasetId,
        resultId: source.id,
      },
    },
    () =>
      prepareInvestigation({
        source,
        clusterId: action.cluster,
        scientific,
        signal,
      }),
    (p) => ({
      summary: `Checked ${p.check.genes.length} markers in ${p.nCells} nuclei; ${p.check.both} nuclei show both selected marker sets.`,
      data: {
        genes: p.check.genes,
        outputCounts: { nuclei: p.nCells, genes: p.check.genes.length },
      },
    }),
  );
  if (signal?.aborted) fail("cancelled");
  const evidenceSha256 = sha(packet);
  let binding;
  try {
    const saved = await connection.query(
      `INSERT INTO investigation_jobs(project_id,owner_id,turn_id,source_run_id,cluster,evidence_sha256,evidence,state)
      SELECT p.id,$2,t.id,$4,$5,$6,$7::jsonb,'submitting' FROM projects p JOIN agent_turns t ON t.project_id=p.id
      JOIN project_datasets d ON d.project_id=p.id WHERE p.id=$1 AND p.owner_id=$2 AND t.id=$3 AND t.owner_id=$2
      AND t.status='running' AND NOT t.cancel_requested AND d.dataset_id=$8 AND d.artifact_version=$9 RETURNING *`,
      [
        projectId,
        ownerId,
        turnId,
        source.id,
        action.cluster,
        evidenceSha256,
        JSON.stringify(packet),
        action.datasetId,
        packet.artifactVersion,
      ],
    );
    binding = saved.rows[0];
    if (!binding) fail("cancelled");
  } catch (error) {
    if (error.code === "23505") fail("investigation_already_submitted");
    throw error;
  }
  try {
    const modelData = {
      provider: "Meterless Nightshift",
      operation: "investigation",
      cluster: action.cluster,
      resultId: source.id,
    };
    const review = await activity.step(
      {
        kind: "model",
        parentSpanId,
        name: "Compare the evidence with Nightshift",
        summary:
          "Nightshift will compare three interpretations against the same measurements and reference evidence.",
        data: modelData,
      },
      (spanId) =>
        provider.run({
          packet,
          signal,
          progress,
          onSubmitted: async (jobId) => {
            modelData.providerJobId = jobId;
            await connection.query(
              "UPDATE investigation_jobs SET provider_job_id=$2,state='running',updated_at=now() WHERE id=$1",
              [binding.id, jobId],
            );
            await activity.event({
              spanId: `investigation-job-${binding.id}`,
              parentSpanId: spanId,
              kind: "model",
              phase: "info",
              name: "Evidence review started",
              summary:
                "The comparison job is recorded in Nightshift. Its result will stay linked to this cell group.",
              data: {
                provider: "Meterless Nightshift",
                providerJobId: jobId,
                cluster: action.cluster,
              },
            });
          },
        }),
      (r) => ({
        summary: `Received ${r.attempts.length} evidence interpretations with validated evidence references.`,
        data: {
          provider: "Meterless Nightshift",
          providerJobId: r.jobId,
          outputCounts: { attempts: r.attempts.length },
        },
      }),
    );
    if (signal?.aborted) fail("cancelled");
    const selected = review.attempts.find(
      (a) => a.sequence === review.selectedAttempt,
    )?.assessment;
    const recommendation = selected?.recommendation
      ? packet.candidates.find((c) => c.id === selected.recommendation).cellType
      : null;
    await connection.query(
      "UPDATE investigation_jobs SET state='completed',updated_at=now() WHERE id=$1",
      [binding.id],
    );
    return {
      version: 1,
      operation: "investigation",
      dataset: source.result.dataset,
      generatedAt: new Date().toISOString(),
      method: {
        id: "marker-co-detection-review-v1",
        label: "Marker co-detection and evidence review",
        description:
          "Descriptive per-nucleus marker detection followed by three bounded interpretations of the same evidence. Original annotation remains unchanged.",
        assay: "RNA",
        layer: "counts",
        parameters: { attempts: 3, maximumGenes: 4, detectionThreshold: 0 },
      },
      warnings: [
        "This review compares the two highest-scoring candidates; other identities may remain possible.",
        "Selected-marker co-detection is not a cell-type classifier or a doublet test.",
        "The reference and measurements come from the same study; this is not independent validation.",
        "A model recommendation is separate from the computed annotation and your saved decision.",
      ],
      summary: {
        sourceRunId: source.id,
        cluster: action.cluster,
        finding:
          selected?.summary ??
          "The review did not select a preferred interpretation. Inspect the alternatives and keep the group unresolved.",
        recommendation,
        attemptCount: review.attempts.length,
        disagreement:
          new Set(review.attempts.map((a) => a.assessment.recommendation))
            .size > 1,
        provider: "Meterless Nightshift",
        jobId: review.jobId,
      },
      payload: {
        packet,
        reference: originalReference,
        ...(reference.delivery
          ? { referenceDelivery: reference.delivery }
          : {}),
        attempts: review.attempts,
        selectedAttempt: review.selectedAttempt,
        receipt: {
          provider: "Meterless Nightshift",
          jobId: review.jobId,
          state: "completed",
          completedAt: new Date().toISOString(),
          evidenceSha256,
        },
      },
    };
  } catch (error) {
    const state =
      error.code === "investigation_submission_unknown"
        ? "submission_unknown"
        : error.code === "investigation_cleanup_required"
          ? "running"
          : signal?.aborted || error.code === "cancelled"
            ? "cancelled"
            : "failed";
    await connection.query(
      "UPDATE investigation_jobs SET state=$2,error_code=$3,updated_at=now() WHERE id=$1",
      [
        binding.id,
        state,
        /^[a-z_]{1,100}$/.test(error.code || "")
          ? error.code
          : "investigation_failed",
      ],
    );
    throw error;
  }
}

/** Reconcile interrupted turns without repeating their model requests. */
export async function cleanupInvestigations(connection, provider) {
  const jobs =
    await connection.query(`SELECT j.id,j.provider_job_id FROM investigation_jobs j JOIN agent_turns t ON t.id=j.turn_id
    WHERE j.state='running' AND t.status IN ('failed','cancelled') ORDER BY j.created_at LIMIT 5`);
  for (const job of jobs.rows) {
    await provider.cancel(job.provider_job_id);
    await connection.query(
      "UPDATE investigation_jobs SET state='cancelled',error_code='turn_interrupted',updated_at=now() WHERE id=$1",
      [job.id],
    );
  }
  await connection.query(`UPDATE investigation_jobs j SET state='submission_unknown',error_code='turn_interrupted',updated_at=now()
    FROM agent_turns t WHERE t.id=j.turn_id AND t.status IN ('failed','cancelled') AND j.state='submitting'`);
}
