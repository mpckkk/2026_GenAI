// Acceptance against the imported real dataset and independently exported R
// values. No synthetic matrix or mocked provider is involved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LocalScientificData } from "../../app/adapters/scientific-data.mjs";
import { parseCsv } from "./import-bundle.mjs";

const directory = process.env.CELLORAS_DATASET_DIR;
assert.ok(
  directory,
  "Set CELLORAS_DATASET_DIR to the real imported dataset store",
);
const adapter = new LocalScientificData({ directory });
const health = await adapter.health();
assert.equal(health.status, "ready");
const catalog = await adapter.catalog();
const dataset = catalog.find((d) => d.id === "gse270392-root-rna-v1");
assert.ok(dataset);
const inspect = await adapter.run({
  datasetId: dataset.id,
  operation: "inspect",
});
assert.equal(inspect.payload.embedding.points.length, 7496);
assert.equal(inspect.payload.clusters.length, 12);
assert.equal(
  inspect.payload.clusters.reduce((sum, c) => sum + c.nCells, 0),
  7496,
);
assert.equal(inspect.summary.recommendedCluster, "0");
const reference = parseCsv(
  await readFile(
    path.join(directory, dataset.id, "source/reference-checks.csv"),
    "utf8",
  ),
);
const sourceGenes = [...new Set(reference.map((r) => r.sourceGeneId))];
const dots = await adapter.run({
  datasetId: dataset.id,
  operation: "dotplot",
  genes: sourceGenes,
});
let comparisons = 0,
  maxError = 0;
for (const row of reference) {
  const geneId = row.sourceGeneId.replace(/^ann1\./, "");
  const value = dots.payload.values.find(
    (v) => v.geneId === geneId && v.cluster === row.cluster,
  );
  assert.ok(value);
  for (const field of ["meanCount", "meanLogExpression", "detectionFraction"]) {
    const error = Math.abs(value[field] - Number(row[field]));
    maxError = Math.max(maxError, error);
    comparisons++;
    assert.ok(error < 1e-10, `${geneId}/${row.cluster}/${field}: ${error}`);
  }
}
for (const sourceGeneId of sourceGenes) {
  const expression = await adapter.run({
    datasetId: dataset.id,
    operation: "expression",
    genes: [sourceGeneId],
  });
  assert.equal(expression.payload.embedding.points.length, 7496);
  const alias = await adapter.run({
    datasetId: dataset.id,
    operation: "expression",
    genes: [expression.payload.gene.geneId],
  });
  assert.deepEqual(alias.payload, expression.payload);
  for (const row of reference.filter((r) => r.sourceGeneId === sourceGeneId)) {
    const other = expression.payload.embedding.points.filter(
      (p) => p.cluster !== row.cluster,
    );
    const mean = other.reduce((sum, p) => sum + p.value, 0) / other.length;
    const error = Math.abs(mean - Number(row.otherMeanLogExpression));
    maxError = Math.max(maxError, error);
    comparisons++;
    assert.ok(error < 1e-10);
  }
}
const topGenes = [];
for (const cluster of inspect.payload.clusters) {
  const markers = await adapter.run({
    datasetId: dataset.id,
    operation: "markers",
    cluster: cluster.id,
  });
  assert.ok(
    markers.payload.markers.length > 0 && markers.payload.markers.length <= 30,
  );
  assert.equal(markers.method.parameters.statisticalTest, false);
  const top = markers.payload.markers[0];
  topGenes.push({ cluster: cluster.id, geneId: top.geneId });
  const expression = await adapter.run({
    datasetId: dataset.id,
    operation: "expression",
    genes: [top.geneId],
  });
  const members = expression.payload.embedding.points.filter(
    (p) => p.cluster === cluster.id,
  );
  const others = expression.payload.embedding.points.filter(
    (p) => p.cluster !== cluster.id,
  );
  const mean = members.reduce((sum, p) => sum + p.value, 0) / members.length;
  const otherMean = others.reduce((sum, p) => sum + p.value, 0) / others.length;
  assert.ok(Math.abs(mean - otherMean - top.score) < 1e-10);
  assert.equal(
    members.filter((p) => p.rawCount > 0).length / members.length,
    top.detectionFraction,
  );
  assert.ok(
    markers.payload.markers.every(
      (m, i, list) =>
        m.score > 0 &&
        m.detectionFraction >= 0.1 &&
        (!i || list[i - 1].score >= m.score),
    ),
  );
}
await assert.rejects(
  adapter.run({
    datasetId: dataset.id,
    operation: "expression",
    genes: ["UNKNOWN_GENE"],
  }),
  { code: "scientific_gene_missing" },
);
await assert.rejects(
  adapter.run({
    datasetId: dataset.id,
    operation: "markers",
    cluster: "missing",
  }),
  { code: "scientific_input_invalid" },
);
await assert.rejects(
  adapter.run({
    datasetId: dataset.id,
    operation: "inspect",
    signal: AbortSignal.abort(),
  }),
  { code: "scientific_cancelled" },
);
await assert.rejects(
  new LocalScientificData({
    directory: "/celloras-missing-dataset-store",
  }).health(),
  { code: "scientific_data_unavailable" },
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      datasetId: dataset.id,
      artifactVersion: dataset.artifactVersion,
      nCells: dataset.nCells,
      nGenes: dataset.nGenes,
      clusters: inspect.payload.clusters.length,
      rReferenceComparisons: comparisons,
      maxError,
      sourceAliasChecks: sourceGenes.length,
      allClusterMarkerOverlayChecks: topGenes,
      invalidInputAndCancellationChecks: 4,
    },
    null,
    2,
  ),
);
