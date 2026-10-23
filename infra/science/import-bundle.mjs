import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function sha256(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}

export function parseCsv(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if (c === "\n" && !quoted) {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (c !== "\r" || quoted) value += c;
  }
  if (quoted) throw new Error("Unterminated CSV field");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const header = rows.shift();
  if (!header || rows.some((r) => r.length !== header.length))
    throw new Error("Invalid CSV dimensions");
  return rows.map((r) =>
    Object.fromEntries(header.map((key, i) => [key || "cellId", r[i]])),
  );
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}
async function json(file, value) {
  await writeFile(file, JSON.stringify(value) + "\n");
}
async function loadMatrix(directory, assay, layer, nCells) {
  const prefix = path.join(directory, `${assay}-${layer}`);
  const [pb, ib, xb, geneText] = await Promise.all([
    readFile(`${prefix}-p.bin`),
    readFile(`${prefix}-i.bin`),
    readFile(`${prefix}-x.bin`),
    readFile(`${prefix}-genes.txt`, "utf8"),
  ]);
  check(
    pb.length === (nCells + 1) * 4 &&
      ib.length % 4 === 0 &&
      xb.length === ib.length * 2,
    "Invalid sparse array lengths",
  );
  const p = new Int32Array(pb.buffer, pb.byteOffset, pb.length / 4);
  const i = new Int32Array(ib.buffer, ib.byteOffset, ib.length / 4);
  const x = new Float64Array(xb.buffer, xb.byteOffset, xb.length / 8);
  const genes = geneText.trimEnd().split("\n");
  check(
    new Set(genes).size === genes.length &&
      p[0] === 0 &&
      p[nCells] === x.length,
    "Invalid sparse matrix dimensions/IDs",
  );
  const sums = new Float64Array(nCells);
  const detected = new Uint32Array(nCells);
  for (let c = 0; c < nCells; c++) {
    check(p[c] <= p[c + 1], "Non-monotonic sparse column pointer");
    let previous = -1;
    for (let n = p[c]; n < p[c + 1]; n++) {
      check(
        i[n] > previous &&
          i[n] < genes.length &&
          Number.isFinite(x[n]) &&
          x[n] >= 0,
        "Invalid sparse matrix value/index",
      );
      previous = i[n];
      sums[c] += x[n];
      if (x[n] > 0) detected[c]++;
    }
  }
  return { p, i, x, genes, sums, detected };
}

async function geneMajor(matrix, directory) {
  await mkdir(directory, { recursive: true });
  const pointers = new Uint32Array(matrix.genes.length + 1);
  for (const g of matrix.i) pointers[g + 1]++;
  for (let g = 1; g < pointers.length; g++) pointers[g] += pointers[g - 1];
  const next = pointers.slice();
  const indices = new Uint32Array(matrix.x.length);
  const values = new Float64Array(matrix.x.length);
  for (let c = 0; c < matrix.p.length - 1; c++) {
    for (let n = matrix.p[c]; n < matrix.p[c + 1]; n++) {
      const position = next[matrix.i[n]]++;
      indices[position] = c;
      values[position] = matrix.x[n];
    }
  }
  await writeFile(
    path.join(directory, "gene-pointers.bin"),
    Buffer.from(pointers.buffer),
  );
  await writeFile(
    path.join(directory, "cell-indices.bin"),
    Buffer.from(indices.buffer),
  );
  await writeFile(
    path.join(directory, "values.bin"),
    Buffer.from(values.buffer),
  );
  await json(
    path.join(directory, "genes.json"),
    matrix.genes.map((sourceGeneId) => ({
      sourceGeneId,
      geneId: sourceGeneId.startsWith("ann1.")
        ? sourceGeneId.slice(5)
        : sourceGeneId,
    })),
  );
}

export async function buildBundle({
  source,
  exported,
  destination,
  descriptor,
  exporterSha256,
}) {
  // The binary format is little-endian; fail explicitly on other architectures.
  check(
    new Uint8Array(new Uint32Array([1]).buffer)[0] === 1,
    "Only little-endian CPUs are supported",
  );
  await mkdir(destination, { recursive: true });
  const cells = parseCsv(
    await readFile(path.join(exported, "cells.csv"), "utf8"),
  );
  check(
    cells.length === descriptor.nCells &&
      new Set(cells.map((c) => c.cellId)).size === cells.length,
    "Source cells mismatch",
  );
  const clusterIds = [...new Set(cells.map((c) => c.seurat_clusters))].sort(
    (a, b) => a.localeCompare(b, "en", { numeric: true }),
  );
  const clusters = clusterIds.map((id) => {
    const members = cells.filter((c) => c.seurat_clusters === id);
    const labels = [...new Set(members.map((c) => c.celltype))];
    check(labels.length === 1, "Ambiguous source label within cluster");
    return { id, nCells: members.length, publishedLabel: labels[0] };
  });
  check(clusters.length === 12, "Unexpected source cluster count");
  const umap = parseCsv(
    await readFile(path.join(exported, "umap.csv"), "utf8"),
  );
  const points = umap.map((row, i) => {
    check(
      row.cellId === cells[i].cellId &&
        Number.isFinite(+row.UMAP_1) &&
        Number.isFinite(+row.UMAP_2),
      "UMAP cell alignment/value failure",
    );
    return {
      cellId: row.cellId,
      x: +row.UMAP_1,
      y: +row.UMAP_2,
      cluster: cells[i].seurat_clusters,
      sampleId: cells[i].sampleID,
    };
  });
  check(points.length === cells.length, "Missing UMAP cells");
  await json(path.join(destination, "embedding.json"), {
    name: "UMAP",
    points,
  });
  await json(path.join(destination, "clusters.json"), clusters);
  await mkdir(path.join(destination, "source"));
  await copyFile(source, path.join(destination, "source", "original.rds.gz"));
  for (const file of [
    "cells.csv",
    "pca.csv",
    "harmony.csv",
    "umap.csv",
    "commands.txt",
    "reference-checks.csv",
  ]) {
    await copyFile(
      path.join(exported, file),
      path.join(destination, "source", file),
    );
  }
  const matrix = await loadMatrix(exported, "RNA", "counts", cells.length);
  check(
    matrix.genes.length === descriptor.nGenes,
    "RNA feature count mismatch",
  );
  for (let c = 0; c < cells.length; c++) {
    check(
      matrix.sums[c] === +cells[c].nCount_RNA &&
        matrix.detected[c] === +cells[c].nFeature_RNA &&
        matrix.sums[c] > 0,
      "RNA sums/detected genes disagree with original metadata",
    );
  }
  for (const suffix of ["p.bin", "i.bin", "x.bin", "genes.txt"]) {
    check(
      (await sha256(path.join(exported, `RNA-counts-${suffix}`))) ===
        (await sha256(path.join(exported, `RNA-data-${suffix}`))),
      "RNA.data is not identical to RNA.counts",
    );
  }
  await geneMajor(matrix, path.join(destination, "rna-counts"));
  await writeFile(
    path.join(destination, "library-sums.bin"),
    Buffer.from(matrix.sums.buffer),
  );
  const nClusters = clusters.length;
  const cellClusters = cells.map((c) => clusterIds.indexOf(c.seurat_clusters));
  const sumCounts = new Float64Array(matrix.genes.length * nClusters);
  const sumLog = new Float64Array(sumCounts.length);
  const detected = new Uint32Array(sumCounts.length);
  for (let c = 0; c < cells.length; c++) {
    for (let n = matrix.p[c]; n < matrix.p[c + 1]; n++) {
      const slot = matrix.i[n] * nClusters + cellClusters[c];
      sumCounts[slot] += matrix.x[n];
      sumLog[slot] += Math.log1p((matrix.x[n] / matrix.sums[c]) * 10000);
      if (matrix.x[n] > 0) detected[slot]++;
    }
  }
  await writeFile(
    path.join(destination, "sum-counts.bin"),
    Buffer.from(sumCounts.buffer),
  );
  await writeFile(
    path.join(destination, "sum-log.bin"),
    Buffer.from(sumLog.buffer),
  );
  await writeFile(
    path.join(destination, "detected.bin"),
    Buffer.from(detected.buffer),
  );
  const reference = parseCsv(
    await readFile(path.join(exported, "reference-checks.csv"), "utf8"),
  );
  let maxReferenceError = 0;
  for (const row of reference) {
    const g = matrix.genes.indexOf(row.sourceGeneId),
      c = clusterIds.indexOf(row.cluster),
      slot = g * nClusters + c;
    check(g >= 0 && c >= 0, "Invalid R cross-check ID");
    let otherLog = 0;
    for (let k = 0; k < nClusters; k++)
      if (k !== c) otherLog += sumLog[g * nClusters + k];
    const comparisons = [
      [sumCounts[slot] / clusters[c].nCells, +row.meanCount],
      [sumLog[slot] / clusters[c].nCells, +row.meanLogExpression],
      [detected[slot] / clusters[c].nCells, +row.detectionFraction],
      [
        otherLog / (cells.length - clusters[c].nCells),
        +row.otherMeanLogExpression,
      ],
    ];
    for (const [actual, expected] of comparisons) {
      maxReferenceError = Math.max(
        maxReferenceError,
        Math.abs(actual - expected),
      );
      check(
        Math.abs(actual - expected) < 1e-10,
        "JS/R numerical cross-check failed",
      );
    }
  }
  check(reference.length === 72, "Missing independent R reference checks");
  const sct = await loadMatrix(exported, "SCT", "counts", cells.length);
  const sctData = await loadMatrix(exported, "SCT", "data", cells.length);
  check(
    sct.genes.length === 23775 && sct.x.length === sctData.x.length,
    "Unexpected SCT dimensions",
  );
  check(
    sct.genes.every((gene, i) => gene === sctData.genes[i]) &&
      sct.p.every((value, i) => value === sctData.p[i]),
    "SCT data/counts alignment mismatch",
  );
  for (let c = 0; c < cells.length; c++) {
    check(
      sct.sums[c] === +cells[c].nCount_SCT &&
        sct.detected[c] === +cells[c].nFeature_SCT,
      "SCT counts disagree with original metadata",
    );
  }
  let maxSctLogError = 0;
  for (let i = 0; i < sct.x.length; i++) {
    check(sct.i[i] === sctData.i[i], "SCT sparse indices differ");
    maxSctLogError = Math.max(
      maxSctLogError,
      Math.abs(Math.log1p(sct.x[i]) - sctData.x[i]),
    );
  }
  check(maxSctLogError < 1e-12, "SCT.data is not log1p(SCT.counts)");
  await geneMajor(sct, path.join(destination, "sct-counts"));
  const assays = [
    {
      name: "RNA",
      nGenes: matrix.genes.length,
      layers: {
        counts: "Original raw UMI counts",
        data: "Identical to counts in the deposited object; not log-normalized",
        scaleData: "Empty",
      },
    },
    {
      name: "SCT",
      nGenes: sct.genes.length,
      layers: {
        counts: "Author-produced SCTransform corrected counts",
        data: "log1p(SCT corrected counts), verified for every nonzero value",
        scaleData:
          "3320 × 7496 author-produced residual matrix retained in original RDS; not exposed for these tools",
      },
    },
  ];
  const verification = {
    nCells: cells.length,
    nGenes: matrix.genes.length,
    rawNonzero: matrix.x.length,
    rawCountSum: matrix.sums.reduce((a, b) => a + b, 0),
    clusters: clusters.length,
    referenceRows: reference.length,
    referenceComparisons: reference.length * 4,
    maxReferenceError,
    maxSctLogError,
    allRawCellSumsMatchSource: true,
    allRawDetectedCountsMatchSource: true,
    allSctCellSumsMatchSource: true,
    allSctDetectedCountsMatchSource: true,
    rnaDataEqualsCounts: true,
    umapAligned: true,
  };
  const { readdir, stat } = await import("node:fs/promises");
  const files = {};
  async function collect(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory())
        await collect(path.join(directory, entry.name), relative + "/");
      else
        files[relative] = {
          bytes: (await stat(path.join(directory, entry.name))).size,
          sha256: await sha256(path.join(directory, entry.name)),
        };
    }
  }
  await collect(destination);
  const manifest = {
    format: "celloras-sparse-v1",
    version: 1,
    dataset: descriptor,
    backend: "local-sparse-cpu",
    endianness: "little",
    importer: {
      version: 1,
      exporterSha256,
      rImage:
        "r-base:4.6.1@sha256:ad9b3bbca751f3ead77704fed4c20246127647b3d567b2bf970b7789e8d7b9a8",
    },
    assays,
    clusters,
    verification,
    files,
  };
  await json(path.join(destination, "manifest.json"), manifest);
  return {
    manifestSha256: await sha256(path.join(destination, "manifest.json")),
    verification,
  };
}
