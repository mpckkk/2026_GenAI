// Acceptance through the real dataset, original sparse R object and publisher
// tables. This does not use synthetic matrices, provider mocks or answer labels
// to calculate predictions.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { LocalScientificData } from "../../app/adapters/scientific-data.mjs";
import { MarkerAnnotationEngine } from "../../app/adapters/annotation-engine.mjs";
import benchmark from "../../data/references/soybean-root-label-benchmark-v1.json" with { type: "json" };
import reference from "../../data/references/soybean-annotation-v1.json" with { type: "json" };

const execute = promisify(execFile);
assert.ok(
  process.env.CELLORAS_DATASET_DIR,
  "Set CELLORAS_DATASET_DIR to the real imported artifact store",
);
const directory = resolve(process.env.CELLORAS_DATASET_DIR);
const output = resolve(".artifacts/annotation/verification");
await mkdir(output, { recursive: true });
const data = new LocalScientificData({ directory });
const engine = new MarkerAnnotationEngine({ scientificData: data });
const health = await engine.health();
assert.equal(health.reference.markerGeneCount, 41);
const result = await engine.run({ datasetId: benchmark.datasetId });
assert.equal(result.dataset.artifactVersion, benchmark.datasetArtifactVersion);
assert.equal(result.payload.clusters.length, 12);
assert.equal(
  result.payload.clusters.reduce((sum, c) => sum + c.nCells, 0),
  7496,
);
assert.equal(result.payload.validation.independentAccuracy, null);
assert.equal(result.method.parameters.sourceLabelsUsedForScoring, false);
assert.equal(result.method.parameters.deNovoMarkersUsedForScoring, false);
assert.ok(Buffer.byteLength(JSON.stringify(result.summary)) < 30000);
for (const cluster of result.payload.clusters) {
  assert.equal(cluster.candidates.length, 9);
  for (const candidate of cluster.candidates) {
    assert.equal(candidate.missingGenes.length, 0);
    const evidence = [
      ...candidate.supportingGenes,
      ...candidate.conflictingGenes,
      ...candidate.uninformativeGenes,
    ];
    assert.equal(
      new Set(evidence.map((g) => g.geneId)).size,
      candidate.referenceGeneCount,
    );
    assert.ok(
      evidence.every(
        (g) =>
          g.sourceRows.length &&
          reference.records.some(
            (r) =>
              r.geneId === g.geneId &&
              r.cellType === candidate.cellType &&
              g.sourceRows.includes(r.row),
          ),
      ),
    );
    if (candidate.cellType === "Pericycle")
      assert.equal(candidate.referenceGeneCount, 8);
    if (candidate.cellType === "Root cap") {
      assert.equal(candidate.score, 0);
      assert.equal(candidate.supportingGenes.length, 0);
    }
  }
}
const selected = await engine.run({
  datasetId: benchmark.datasetId,
  cluster: "6",
});
assert.deepEqual(selected.payload.clusters, [
  result.payload.clusters.find((c) => c.cluster === "6"),
]);
assert.equal(selected.payload.clusters[0].suggestedLabel, "Root hair");
const again = await engine.run({ datasetId: benchmark.datasetId });
assert.deepEqual(again.payload, result.payload);
await assert.rejects(
  engine.run({ datasetId: benchmark.datasetId, cluster: "not-a-cluster" }),
  { code: "annotation_input_invalid" },
);
await assert.rejects(
  engine.run({ datasetId: benchmark.datasetId, signal: AbortSignal.abort() }),
  { code: "annotation_cancelled" },
);
await assert.rejects(engine.run({ datasetId: "missing-dataset" }), {
  code: "scientific_dataset_missing",
});
await assert.rejects(
  new MarkerAnnotationEngine({
    scientificData: new LocalScientificData({
      directory: resolve(output, "absent-store"),
    }),
  }).run({ datasetId: benchmark.datasetId }),
  { code: "scientific_data_unavailable" },
);
await writeFile(
  resolve(output, "result.json"),
  JSON.stringify(result, null, 2),
);

const fields = [
  "cluster",
  "sourceGeneId",
  "meanLogExpression",
  "otherMeanLogExpression",
  "detectionFraction",
  "otherDetectionFraction",
  "enrichment",
  "zScore",
];
const csv = [fields.join(",")];
for (const cluster of result.payload.clusters)
  for (const candidate of cluster.candidates)
    for (const gene of [
      ...candidate.supportingGenes,
      ...candidate.conflictingGenes,
      ...candidate.uninformativeGenes,
    ])
      csv.push(
        fields
          .map((f) => (f === "cluster" ? cluster.cluster : gene[f]))
          .join(","),
      );
await writeFile(resolve(output, "engine-evidence.csv"), csv.join("\n") + "\n");
const { stdout: independentR } = await execute(
  "docker",
  [
    "run",
    "--rm",
    "--network",
    "none",
    "--memory",
    "3g",
    "--cpus",
    "1",
    "-v",
    `${resolve(directory, benchmark.datasetId, "source/original.rds.gz")}:/source.rds.gz:ro`,
    "-v",
    `${resolve(output, "engine-evidence.csv")}:/evidence.csv:ro`,
    "-v",
    `${resolve("infra/science/verify-annotation.R")}:/verify.R:ro`,
    "r-base:4.6.1@sha256:ad9b3bbca751f3ead77704fed4c20246127647b3d567b2bf970b7789e8d7b9a8",
    "Rscript",
    "/verify.R",
    "/source.rds.gz",
    "/evidence.csv",
  ],
  { maxBuffer: 1_000_000 },
);
console.log(independentR.trim());

// Re-read the real publisher Table S1 and compare every barcode/cluster to the
// actual imported dataset before evaluating against its source-label summary.
assert.equal(
  createHash("sha256")
    .update(
      await readFile(resolve(".artifacts/annotation/atlas-table-s1.xlsx")),
    )
    .digest("hex"),
  benchmark.source.sha256,
);
const { stdout: sourceLabels } = await execute("python3", [
  "infra/science/extract-annotation-reference.py",
  "benchmark",
  resolve(".artifacts/annotation/atlas-table-s1.xlsx"),
  resolve(directory, benchmark.datasetId, "source/cells.csv"),
]);
const source = JSON.parse(sourceLabels);
assert.deepEqual(source.clusters, benchmark.clusters);
assert.equal(source.cellMembershipSha256, benchmark.cellMembershipSha256);
const comparisons = result.payload.clusters.map((cluster) => {
  const published = benchmark.clusters.find(
    (c) => c.cluster === cluster.cluster,
  );
  assert.equal(published.nCells, cluster.nCells);
  return {
    cluster: cluster.cluster,
    nCells: cluster.nCells,
    status: cluster.status,
    suggestedLabel: cluster.suggestedLabel,
    leadingCandidate: cluster.candidates[0].cellType,
    publishedLabel: published.publishedLabel,
    suggestedAgreement:
      cluster.suggestedLabel === null
        ? null
        : cluster.suggestedLabel === published.publishedLabel,
    leadingCandidateAgreement:
      cluster.candidates[0].cellType === published.publishedLabel,
  };
});
const report = {
  status: "passed",
  datasetId: benchmark.datasetId,
  artifactVersion: result.dataset.artifactVersion,
  reference: result.payload.reference,
  numerical: JSON.parse(independentR.trim()),
  sameStudyEvaluation: {
    independent: false,
    description: benchmark.purpose,
    matchingCellIdsAndClusters: source.matchedCellCount,
    suggested: comparisons.filter((c) => c.suggestedLabel !== null).length,
    suggestedAgreements: comparisons.filter(
      (c) => c.suggestedAgreement === true,
    ).length,
    leadingCandidateAgreements: comparisons.filter(
      (c) => c.leadingCandidateAgreement,
    ).length,
    ambiguous: result.summary.ambiguousCount,
    unresolved: result.summary.unresolvedCount,
    comparisons,
  },
  checks: [
    "reference_integrity",
    "exact_source_genes",
    "deduplicated_marker_associations",
    "source_labels_excluded_from_ranking",
    "independent_original_R_values",
    "all_cluster_and_single_cluster_consistency",
    "deterministic_repeat",
    "cancelled",
    "invalid_cluster",
    "missing_dataset",
    "unavailable_store_fails",
    "bounded_model_summary",
  ],
};
await writeFile(
  resolve(output, "report.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
