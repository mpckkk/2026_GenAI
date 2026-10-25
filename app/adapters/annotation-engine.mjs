import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const thresholds = Object.freeze({
  minimumDetectionFraction: 0.1,
  minimumEnrichment: 0.1,
  minimumGeneZScore: 0.5,
  minimumSupportingGenes: 2,
  minimumCandidateScore: 0.5,
  minimumAvailableFraction: 0.5,
  ambiguityMargin: 0.25,
});

export class AnnotationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AnnotationError";
    this.code = code;
  }
}
const fail = (code, message) => new AnnotationError(code, message);
function cancelled(signal) {
  if (signal?.aborted)
    throw fail("annotation_cancelled", "Cell-type annotation was cancelled");
}

export function verifiedReference() {
  // Bundlers can rewrite JSON floating-point literals. Verify the original
  // file in both the standalone web app and the native agent worker.
  let referenceData;
  try {
    referenceData = JSON.parse(
      readFileSync(
        join(process.cwd(), "data/references/soybean-annotation-v1.json"),
        "utf8",
      ),
    );
  } catch {
    throw fail(
      "annotation_reference_unavailable",
      "The pinned annotation reference could not be read",
    );
  }
  const { contentSha256, ...content } = referenceData;
  const digest = createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
  if (
    digest !== contentSha256 ||
    referenceData.version !== 1 ||
    referenceData.reference.sha256 !==
      "18de89ddb0a729738e061df52f1966b952ecc0d03fa86243f500d5775233a616" ||
    referenceData.records.length !== 42 ||
    new Set(referenceData.records.map((r) => r.geneId)).size !== 41 ||
    new Set(referenceData.records.map((r) => r.cellType)).size !== 9 ||
    referenceData.records.some(
      (r) =>
        !/^Glyma\.\d{2}G\d{6}$/.test(r.geneId) ||
        !r.originalReference ||
        !Number.isInteger(r.row),
    )
  )
    throw fail(
      "annotation_reference_unavailable",
      "The pinned annotation reference failed verification",
    );
  return referenceData;
}

const method = {
  id: "literature-marker-enrichment-v1",
  label: "Literature marker enrichment · review required",
  description:
    "For each literature marker, compare mean log1p(CP10k) expression across all dataset clusters and calculate a population z-score. A cell-type score is the sum of its available marker z-scores divided by its distinct reference-gene count (missing genes contribute zero). Supporting markers require at least 10% detection, a cluster-minus-rest mean difference of at least 0.1 and z-score of at least 0.5. Suggest a label only with at least two supporting genes, at least half its reference genes available and mean score at least 0.5. Competing eligible labels within 0.25 score units remain ambiguous. These fixed exploratory rules are not calibrated probabilities or significance tests.",
  assay: "RNA",
  layer: "counts",
  parameters: {
    ...thresholds,
    normalization: "mean(log1p(raw counts / nucleus total * 10000))",
    score: "mean marker z-score across clusters",
    zScoreVariance: "population",
    referencePanel: "Table S2 literature-derived Root column only",
    duplicateGeneTypeCountedOnce: true,
    sourceLabelsUsedForScoring: false,
    deNovoMarkersUsedForScoring: false,
    statisticalTest: false,
  },
};

/** Provider-neutral numerical annotation. The model never chooses evidence values. */
export class MarkerAnnotationEngine {
  constructor({ scientificData }) {
    if (!scientificData || typeof scientificData.run !== "function")
      throw new TypeError("A scientific data provider is required");
    this.scientificData = scientificData;
  }

  async health() {
    return {
      status: "ready",
      reference: structuredClone(verifiedReference().reference),
    };
  }

  async run({ datasetId, cluster, signal }) {
    cancelled(signal);
    if (
      typeof datasetId !== "string" ||
      !datasetId ||
      (cluster !== undefined && typeof cluster !== "string")
    )
      throw fail(
        "annotation_input_invalid",
        "Choose a dataset and an optional exact cluster ID",
      );
    const source = verifiedReference();
    const inspection = await this.scientificData.run({
      datasetId,
      operation: "inspect",
      signal,
    });
    const { dataset } = inspection;
    if (inspection.operation !== "inspect")
      throw fail(
        "annotation_data_invalid",
        "The scientific provider returned the wrong operation",
      );
    if (
      dataset.speciesId !== source.reference.speciesId ||
      dataset.tissue !== source.reference.tissue ||
      dataset.genomeBuild !== source.reference.genomeBuild
    )
      throw fail(
        "annotation_reference_incompatible",
        "No verified annotation reference matches this dataset's species, tissue and genome build; gene IDs are not converted automatically",
      );
    const allClusters = inspection.payload.clusters;
    const selected =
      cluster === undefined
        ? allClusters
        : allClusters.filter((c) => c.id === cluster);
    if (!selected.length || allClusters.length < 2)
      throw fail(
        "annotation_input_invalid",
        "Choose an existing cluster in a dataset with at least two clusters",
      );
    if (allClusters.reduce((n, c) => n + c.nCells, 0) !== dataset.nCells)
      throw fail(
        "annotation_data_invalid",
        "The cluster counts do not match the dataset",
      );

    const uniqueGenes = [
      ...new Set(source.records.map((r) => r.geneId)),
    ].sort();
    const profiles = new Map(),
      missing = new Set();
    // One explicit gene per request distinguishes absence (reportable evidence)
    // from a provider outage (a failed analysis), without guessing aliases.
    for (const geneId of uniqueGenes) {
      cancelled(signal);
      let result;
      try {
        result = await this.scientificData.run({
          datasetId,
          operation: "dotplot",
          genes: [geneId],
          signal,
        });
      } catch (error) {
        if (error?.code !== "scientific_gene_missing") throw error;
        missing.add(geneId);
        continue;
      }
      if (
        result.operation !== "dotplot" ||
        result.dataset.artifactVersion !== dataset.artifactVersion ||
        result.payload.genes.length !== 1 ||
        result.payload.genes[0].geneId !== geneId
      )
        throw fail(
          "annotation_data_invalid",
          "Annotation input changed or a different gene was returned",
        );
      const values = result.payload.values;
      if (
        values.length !== allClusters.length ||
        new Set(values.map((v) => v.cluster)).size !== allClusters.length ||
        values.some(
          (v) =>
            !allClusters.some((c) => c.id === v.cluster) ||
            v.geneId !== geneId ||
            !Number.isFinite(v.meanLogExpression) ||
            v.meanLogExpression < 0 ||
            !Number.isFinite(v.detectionFraction) ||
            v.detectionFraction < 0 ||
            v.detectionFraction > 1,
        )
      )
        throw fail(
          "annotation_data_invalid",
          "The scientific provider returned incomplete or invalid gene statistics",
        );
      const mean =
        values.reduce((sum, v) => sum + v.meanLogExpression, 0) / values.length;
      const sd = Math.sqrt(
        values.reduce((sum, v) => sum + (v.meanLogExpression - mean) ** 2, 0) /
          values.length,
      );
      profiles.set(geneId, { gene: result.payload.genes[0], values, mean, sd });
    }
    const cellTypes = [
      ...new Set(source.records.map((r) => r.cellType)),
    ].sort();
    const clusters = selected.map((selectedCluster) => {
      const candidates = cellTypes
        .map((cellType) => {
          const records = source.records.filter((r) => r.cellType === cellType);
          const genes = [...new Set(records.map((r) => r.geneId))];
          const evidence = [],
            missingGenes = [];
          for (const geneId of genes) {
            const profile = profiles.get(geneId);
            if (!profile) {
              missingGenes.push(geneId);
              continue;
            }
            const associations = records.filter((r) => r.geneId === geneId);
            const value = profile.values.find(
              (v) => v.cluster === selectedCluster.id,
            );
            const restSize = dataset.nCells - selectedCluster.nCells;
            let otherMeanLogExpression = 0,
              otherDetectionFraction = 0;
            for (const other of profile.values) {
              if (other.cluster === selectedCluster.id) continue;
              const count = allClusters.find(
                (c) => c.id === other.cluster,
              ).nCells;
              otherMeanLogExpression +=
                (other.meanLogExpression * count) / restSize;
              otherDetectionFraction +=
                (other.detectionFraction * count) / restSize;
            }
            const enrichment = value.meanLogExpression - otherMeanLogExpression;
            const zScore =
              profile.sd > 1e-12
                ? (value.meanLogExpression - profile.mean) / profile.sd
                : 0;
            const supports =
              value.detectionFraction >= thresholds.minimumDetectionFraction &&
              enrichment >= thresholds.minimumEnrichment &&
              zScore >= thresholds.minimumGeneZScore;
            const conflicts =
              otherDetectionFraction >= thresholds.minimumDetectionFraction &&
              enrichment <= -thresholds.minimumEnrichment &&
              zScore <= -thresholds.minimumGeneZScore;
            evidence.push({
              geneId,
              sourceGeneId: profile.gene.sourceGeneId,
              markerName: associations[0].markerName,
              sourceRows: associations.map((r) => r.row),
              sourceUrl: source.reference.url,
              sourceSpecies: associations[0].sourceSpecies,
              orthologyType: associations[0].orthologyType,
              originalReferences: [
                ...new Set(associations.map((r) => r.originalReference)),
              ],
              meanLogExpression: value.meanLogExpression,
              otherMeanLogExpression,
              detectionFraction: value.detectionFraction,
              otherDetectionFraction,
              enrichment,
              zScore,
              assessment: supports
                ? "supports"
                : conflicts
                  ? "conflicts"
                  : "not_informative",
            });
          }
          evidence.sort(
            (a, b) => b.zScore - a.zScore || a.geneId.localeCompare(b.geneId),
          );
          const supportingGenes = evidence.filter(
            (g) => g.assessment === "supports",
          );
          const conflictingGenes = evidence.filter(
            (g) => g.assessment === "conflicts",
          );
          return {
            cellType,
            score:
              evidence.reduce((sum, g) => sum + g.zScore, 0) / genes.length,
            referenceGeneCount: genes.length,
            availableGeneCount: evidence.length,
            supportingGenes,
            conflictingGenes,
            uninformativeGenes: evidence.filter(
              (g) => g.assessment === "not_informative",
            ),
            missingGenes,
            reason: `${supportingGenes.length} of ${genes.length} distinct reference genes show supporting enrichment; ${conflictingGenes.length} are more enriched in other clusters and ${missingGenes.length} are absent from the feature axis. Absence or low detection alone does not rule out a cell identity.`,
          };
        })
        .sort(
          (a, b) => b.score - a.score || a.cellType.localeCompare(b.cellType),
        );
      const eligible = candidates.filter(
        (c) =>
          c.score >= thresholds.minimumCandidateScore &&
          c.supportingGenes.length >= thresholds.minimumSupportingGenes &&
          c.availableGeneCount / c.referenceGeneCount >=
            thresholds.minimumAvailableFraction,
      );
      const top = candidates[0],
        winner = eligible[0];
      // A high-scoring but weakly supported competitor also prevents a confident
      // suggestion. We do not silently skip it and choose the next eligible label.
      const close =
        winner &&
        candidates.filter(
          (c) =>
            c.cellType !== winner.cellType &&
            c.supportingGenes.length >= 1 &&
            c.score >= winner.score - thresholds.ambiguityMargin,
        );
      const status = !winner
        ? "unresolved"
        : close.length || winner !== top
          ? "ambiguous"
          : "suggested";
      const suggestedLabel = status === "suggested" ? winner.cellType : null;
      const interpretation =
        status === "suggested"
          ? `${winner.cellType} passes the fixed exploratory evidence rules with ${winner.supportingGenes.length} supporting genes. Review expression, alternatives and the source associations before accepting.`
          : status === "ambiguous"
            ? `Competing marker programs (${[winner.cellType, ...close.map((c) => c.cellType)].join(", ")}) prevent a single suggestion. A related cell state, mixed cluster or incomplete reference may explain this pattern.`
            : `No candidate meets all evidence rules. The leading score is ${top.cellType}, supported by ${top.supportingGenes.length} genes; this is insufficient for an automatic suggestion.`;
      const reason =
        interpretation +
        (selectedCluster.nCells < 50
          ? ` This small cluster contains only ${selectedCluster.nCells} nuclei; its descriptive averages can be unstable.`
          : "");
      return {
        cluster: selectedCluster.id,
        nCells: selectedCluster.nCells,
        status,
        suggestedLabel,
        candidates,
        reason,
      };
    });
    cancelled(signal);
    const validation = {
      status: "not_independently_validated",
      description:
        "This exploratory marker ranking requires researcher review. The reference was curated by the same study that produced the demo dataset. Retrospective agreement with that study's labels is not independent accuracy or evidence of performance on new data. Published cell labels and de-novo marker results are excluded from the ranking.",
      independentAccuracy: null,
    };
    return {
      version: 1,
      operation: "annotation",
      dataset,
      generatedAt: new Date().toISOString(),
      method: structuredClone(method),
      warnings: [
        "Candidates are exploratory biological interpretations, not validated identities or calibrated confidence percentages. A researcher must accept, correct or leave them unresolved.",
        "The marker panel combines authors' soybean associations with Arabidopsis orthology-derived associations. Ortholog function, duplicated genes and developmental context can differ.",
        "Negative enrichment is relative to this dataset and is not proof against an identity. Dropout, mixed populations, stress and incomplete reference coverage can affect results.",
        "The ranking uses cluster averages without biological-replicate adjustment, statistical tests or per-nucleus classification.",
        ...(missing.size
          ? [
              `${missing.size} reference genes are absent from this dataset; exact gene IDs are retained and no cross-build aliases are inferred.`,
            ]
          : []),
      ],
      summary: {
        clusterCount: clusters.length,
        suggestedCount: clusters.filter((c) => c.status === "suggested").length,
        ambiguousCount: clusters.filter((c) => c.status === "ambiguous").length,
        unresolvedCount: clusters.filter((c) => c.status === "unresolved")
          .length,
        candidates: clusters.map((c) => ({
          cluster: c.cluster,
          status: c.status,
          suggestedLabel: c.suggestedLabel,
          leadingCandidate: c.candidates[0]?.cellType ?? null,
          reason: c.reason,
          topCandidates: c.candidates.slice(0, 3).map((candidate) => ({
            cellType: candidate.cellType,
            score: candidate.score,
            supportingGenes: candidate.supportingGenes
              .slice(0, 6)
              .map((g) => g.geneId),
            conflictingGenes: candidate.conflictingGenes
              .slice(0, 6)
              .map((g) => g.geneId),
            reason: candidate.reason,
          })),
        })),
        referenceId: source.reference.id,
        referenceVersion: source.reference.version,
        referenceUrl: source.reference.url,
      },
      payload: {
        reference: structuredClone(source.reference),
        clusters,
        validation,
      },
    };
  }
}
