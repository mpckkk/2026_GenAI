import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";

export class ScientificDataError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ScientificDataError";
    this.code = code;
  }
}
const failure = (code, message) => new ScientificDataError(code, message);
const invalid = (message) => failure("scientific_input_invalid", message);
function cancelled(signal) {
  if (signal?.aborted)
    throw failure("scientific_cancelled", "Scientific analysis was cancelled");
}
async function digest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
async function doubles(file) {
  const bytes = await readFile(file);
  if (bytes.length % 8) throw new Error("Invalid float64 array");
  return new Float64Array(bytes.buffer, bytes.byteOffset, bytes.length / 8);
}
async function uints(file) {
  const bytes = await readFile(file);
  if (bytes.length % 4) throw new Error("Invalid uint32 array");
  return new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
}
function publicDataset(manifest, artifactVersion) {
  const d = manifest.dataset;
  return {
    id: d.id,
    title: d.title,
    speciesId: d.speciesId,
    species: d.species,
    tissue: d.tissue,
    genomeBuild: d.genomeBuild,
    genomeBuildEvidence: d.genomeBuildEvidence,
    nCells: d.nCells,
    nGenes: d.nGenes,
    artifactVersion,
    source: {
      accession: d.source.accession,
      url: d.source.url,
      paperUrl: d.source.paperUrl,
      sha256: d.source.sha256,
    },
  };
}
const expressionMethod = {
  id: "rna-log1p-cp10k-v1",
  label: "Raw RNA counts · log1p counts per 10,000",
  description:
    "For each nucleus, divide each raw RNA gene count by that nucleus's total raw RNA count, multiply by 10,000 and take log1p. Include zeros in group means. Detection is the fraction of nuclei with raw count > 0. Source RNA.data duplicates raw counts, so it is not treated as normalized expression.",
  assay: "RNA",
  layer: "counts",
  parameters: {
    scaleFactor: 10000,
    transform: "log1p",
    zeroCellsIncluded: true,
    backend: "local-sparse-cpu",
  },
};

export class LocalScientificData {
  constructor({ directory = process.env.CELLORAS_DATASET_DIR } = {}) {
    // This is an explicitly configured, read-only runtime mount. Turbopack must
    // not trace the working directory (including local secrets and source data)
    // while trying to resolve an environment-dependent external dataset path.
    this.directory = directory
      ? path.resolve(/* turbopackIgnore: true */ directory)
      : undefined;
    this.loaded = new Map();
    this.loading = new Map();
  }

  async entries() {
    if (!this.directory)
      throw failure(
        "scientific_data_unavailable",
        "Scientific dataset storage is not configured",
      );
    try {
      const catalog = await json(path.join(this.directory, "catalog.json"));
      if (
        catalog.version !== 1 ||
        !Array.isArray(catalog.datasets) ||
        !catalog.datasets.length ||
        catalog.datasets.some(
          (d) =>
            !/^[a-z0-9][a-z0-9-]{0,99}$/.test(d.id) ||
            !/^[a-f0-9]{64}$/.test(d.manifestSha256),
        ) ||
        new Set(catalog.datasets.map((d) => d.id)).size !==
          catalog.datasets.length
      )
        throw new Error("Invalid dataset catalog");
      return catalog.datasets;
    } catch (cause) {
      throw new ScientificDataError(
        "scientific_data_unavailable",
        "The verified scientific dataset catalog is unavailable",
        { cause },
      );
    }
  }

  async load(entry) {
    const cached = this.loaded.get(entry.id);
    if (cached) {
      try {
        if (cached.dataset.artifactVersion !== entry.manifestSha256)
          throw new Error("An immutable dataset version changed");
        // Detect changed files before using cached aggregates. A changed artifact
        // must be reimported under a new ID; do not silently keep stale results.
        for (const [file, before] of Object.entries(cached.fingerprints)) {
          const now = await stat(path.join(cached.directory, file));
          if (now.size !== before.size || now.mtimeMs !== before.mtimeMs)
            throw new Error("A verified dataset artifact changed on disk");
        }
      } catch (cause) {
        throw new ScientificDataError(
          "scientific_data_unavailable",
          "A verified dataset artifact changed or disappeared",
          { cause },
        );
      }
      return cached;
    }
    if (this.loading.has(entry.id)) return this.loading.get(entry.id);
    const pending = this.loadVerified(entry);
    this.loading.set(entry.id, pending);
    try {
      const value = await pending;
      this.loaded.set(entry.id, value);
      return value;
    } finally {
      this.loading.delete(entry.id);
    }
  }

  async loadVerified(entry) {
    try {
      if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1)
        throw new Error("Little-endian CPU required");
      const directory = path.join(this.directory, entry.id);
      const manifestPath = path.join(directory, "manifest.json");
      if ((await digest(manifestPath)) !== entry.manifestSha256)
        throw new Error("Manifest checksum mismatch");
      const manifest = await json(manifestPath);
      if (
        manifest.format !== "celloras-sparse-v1" ||
        manifest.version !== 1 ||
        manifest.dataset.id !== entry.id ||
        manifest.backend !== "local-sparse-cpu" ||
        manifest.endianness !== "little" ||
        manifest.files["source/original.rds.gz"].sha256 !==
          manifest.dataset.source.sha256
      )
        throw new Error("Invalid manifest/source provenance");
      const fingerprints = { "manifest.json": await stat(manifestPath) };
      for (const [relative, expected] of Object.entries(manifest.files)) {
        if (
          !/^[a-zA-Z0-9_./-]+$/.test(relative) ||
          path.isAbsolute(relative) ||
          relative.split("/").includes("..")
        )
          throw new Error("Invalid artifact path");
        const file = path.join(directory, relative),
          info = await stat(file);
        if (
          info.size !== expected.bytes ||
          (await digest(file)) !== expected.sha256
        )
          throw new Error(`Artifact integrity failure: ${relative}`);
        fingerprints[relative] = info;
      }
      const [
        genes,
        clusters,
        embedding,
        librarySums,
        pointers,
        sumCounts,
        sumLog,
        detected,
      ] = await Promise.all([
        json(path.join(directory, "rna-counts/genes.json")),
        json(path.join(directory, "clusters.json")),
        json(path.join(directory, "embedding.json")),
        doubles(path.join(directory, "library-sums.bin")),
        uints(path.join(directory, "rna-counts/gene-pointers.bin")),
        doubles(path.join(directory, "sum-counts.bin")),
        doubles(path.join(directory, "sum-log.bin")),
        uints(path.join(directory, "detected.bin")),
      ]);
      const dataset = publicDataset(manifest, entry.manifestSha256);
      if (
        genes.length !== dataset.nGenes ||
        embedding.points.length !== dataset.nCells ||
        librarySums.length !== dataset.nCells ||
        pointers.length !== dataset.nGenes + 1 ||
        sumCounts.length !== dataset.nGenes * clusters.length ||
        sumLog.length !== sumCounts.length ||
        detected.length !== sumCounts.length
      )
        throw new Error("Artifact dimensions mismatch");
      const geneLookup = new Map();
      genes.forEach((gene, index) => {
        for (const id of new Set([gene.geneId, gene.sourceGeneId])) {
          if (geneLookup.has(id)) throw new Error("Ambiguous gene alias");
          geneLookup.set(id, index);
        }
      });
      return {
        directory,
        manifest,
        dataset,
        genes,
        geneLookup,
        clusters,
        embedding,
        librarySums,
        pointers,
        sumCounts,
        sumLog,
        detected,
        fingerprints,
      };
    } catch (cause) {
      throw new ScientificDataError(
        "scientific_data_unavailable",
        "Scientific dataset verification failed",
        { cause },
      );
    }
  }

  async catalog() {
    const entries = await this.entries();
    const result = [];
    for (const entry of entries) result.push((await this.load(entry)).dataset);
    return result;
  }

  async health() {
    return {
      status: "ready",
      backend: "local-sparse-cpu",
      datasetCount: (await this.catalog()).length,
    };
  }

  async run({ datasetId, operation, cluster, genes, signal }) {
    cancelled(signal);
    if (
      typeof datasetId !== "string" ||
      !["inspect", "markers", "expression", "dotplot"].includes(operation)
    )
      throw invalid("Choose a dataset and supported scientific operation");
    const entry = (await this.entries()).find((d) => d.id === datasetId);
    if (!entry)
      throw failure(
        "scientific_dataset_missing",
        "That dataset is not available in this catalog",
      );
    const data = await this.load(entry);
    cancelled(signal);
    const base = {
      version: 1,
      dataset: data.dataset,
      operation,
      generatedAt: new Date().toISOString(),
      warnings: [...data.manifest.dataset.warnings],
    };
    if (operation === "inspect")
      return {
        ...base,
        method: {
          id: "published-seurat-embedding-v1",
          label: "Published atlas · preserved clusters and UMAP",
          description:
            "Display the authors' existing UMAP and seurat_clusters without recomputing an embedding or assigning biological cell types. Original PCA, Harmony, metadata and RDS are retained with checksums.",
          assay: "RNA",
          layer: "counts",
          parameters: {
            embedding: "published UMAP",
            clusterField: "seurat_clusters",
            backend: "local-sparse-cpu",
          },
        },
        summary: {
          nCells: data.dataset.nCells,
          nGenes: data.dataset.nGenes,
          nClusters: data.clusters.length,
          sampleIds: [...new Set(data.embedding.points.map((p) => p.sampleId))],
          clusters: data.clusters,
          recommendedCluster: data.clusters.reduce((a, b) =>
            a.nCells >= b.nCells ? a : b,
          ).id,
        },
        payload: {
          clusters: data.clusters,
          embedding: data.embedding,
          assays: data.manifest.assays,
        },
      };
    if (operation === "markers") {
      const c = data.clusters.findIndex(
        (candidate) => candidate.id === cluster,
      );
      if (c < 0) throw invalid("Choose a cluster from the inspected dataset");
      const nCells = data.clusters[c].nCells,
        otherNCells = data.dataset.nCells - nCells,
        width = data.clusters.length;
      const ranked = [];
      for (let g = 0; g < data.genes.length; g++) {
        const slot = g * width + c;
        const detectionFraction = data.detected[slot] / nCells;
        if (detectionFraction < 0.1) continue;
        let otherLog = 0,
          otherDetected = 0;
        for (let k = 0; k < width; k++)
          if (k !== c) {
            otherLog += data.sumLog[g * width + k];
            otherDetected += data.detected[g * width + k];
          }
        const meanLogExpression = data.sumLog[slot] / nCells,
          otherMeanLogExpression = otherLog / otherNCells;
        const score = meanLogExpression - otherMeanLogExpression;
        if (score <= 0) continue;
        ranked.push({
          ...data.genes[g],
          score,
          meanLogExpression,
          otherMeanLogExpression,
          detectionFraction,
          otherDetectionFraction: otherDetected / otherNCells,
          meanCount: data.sumCounts[slot] / nCells,
        });
      }
      ranked.sort(
        (a, b) => b.score - a.score || a.geneId.localeCompare(b.geneId),
      );
      const markers = ranked.slice(0, 30);
      cancelled(signal);
      return {
        ...base,
        warnings: [
          ...base.warnings,
          "These are descriptive cluster-versus-rest rankings, not statistical differential-expression tests or validated biological markers. No p-values, false-discovery rates or annotation confidence are calculated.",
          "Ranking is not adjusted for sample, batch or biological replicate; use it to explore candidate genes.",
        ],
        method: {
          ...expressionMethod,
          id: "descriptive-cluster-markers-v1",
          label: "Candidate markers · descriptive cluster-versus-rest ranking",
          description:
            expressionMethod.description +
            " Rank genes by the difference in mean log-normalized expression between the selected cluster and all remaining nuclei. Keep positive differences and genes detected in at least 10% of the selected cluster; return the top 30.",
          parameters: {
            ...expressionMethod.parameters,
            minimumDetectionFraction: 0.1,
            maximumGenes: 30,
            ranking: "mean(log1p(CP10k)) cluster minus rest",
            statisticalTest: false,
          },
        },
        summary: {
          cluster,
          nCells,
          otherNCells,
          rankedGeneCount: ranked.length,
          topMarkers: markers.slice(0, 10),
        },
        payload: { cluster, comparison: "rest", nCells, otherNCells, markers },
      };
    }
    if (
      !Array.isArray(genes) ||
      !genes.length ||
      genes.length > 12 ||
      genes.some((g) => typeof g !== "string" || g.length > 100)
    )
      throw invalid("Choose between 1 and 12 exact gene IDs");
    const indices = genes.map((gene) => {
      const index = data.geneLookup.get(gene);
      if (index === undefined)
        throw failure(
          "scientific_gene_missing",
          `Gene ${gene} is absent from this dataset. Use an exact listed gene ID; symbols and cross-build aliases are not inferred.`,
        );
      return index;
    });
    if (new Set(indices).size !== indices.length)
      throw invalid("Choose each gene only once");
    if (operation === "dotplot") {
      const values = indices.flatMap((g) =>
        data.clusters.map((c, index) => {
          const slot = g * data.clusters.length + index;
          return {
            geneId: data.genes[g].geneId,
            cluster: c.id,
            meanLogExpression: data.sumLog[slot] / c.nCells,
            detectionFraction: data.detected[slot] / c.nCells,
            meanCount: data.sumCounts[slot] / c.nCells,
          };
        }),
      );
      return {
        ...base,
        method: expressionMethod,
        summary: {
          genes: indices.map((g) => data.genes[g]),
          nClusters: data.clusters.length,
          values,
        },
        payload: {
          genes: indices.map((g) => data.genes[g]),
          clusters: data.clusters,
          values,
        },
      };
    }
    if (indices.length !== 1)
      throw invalid("An expression overlay displays one gene at a time");
    const g = indices[0],
      start = data.pointers[g],
      end = data.pointers[g + 1];
    const cellBytes = Buffer.alloc((end - start) * 4),
      valueBytes = Buffer.alloc((end - start) * 8);
    const cellFile = await open(
      path.join(data.directory, "rna-counts/cell-indices.bin"),
      "r",
    );
    const valueFile = await open(
      path.join(data.directory, "rna-counts/values.bin"),
      "r",
    );
    try {
      const [cellRead, valueRead] = await Promise.all([
        cellFile.read(cellBytes, 0, cellBytes.length, start * 4),
        valueFile.read(valueBytes, 0, valueBytes.length, start * 8),
      ]);
      if (
        cellRead.bytesRead !== cellBytes.length ||
        valueRead.bytesRead !== valueBytes.length
      )
        throw failure(
          "scientific_data_unavailable",
          "Incomplete gene expression array",
        );
    } finally {
      await cellFile.close();
      await valueFile.close();
    }
    cancelled(signal);
    const counts = new Float64Array(data.dataset.nCells);
    for (let i = 0; i < end - start; i++)
      counts[cellBytes.readUInt32LE(i * 4)] = valueBytes.readDoubleLE(i * 8);
    let max = 0,
      detected = 0,
      totalLog = 0;
    const points = data.embedding.points.map((point, index) => {
      const value = Math.log1p(
        (counts[index] / data.librarySums[index]) * 10000,
      );
      max = Math.max(max, value);
      if (counts[index] > 0) detected++;
      totalLog += value;
      return { ...point, value, rawCount: counts[index] };
    });
    return {
      ...base,
      method: expressionMethod,
      summary: {
        gene: data.genes[g],
        nCells: data.dataset.nCells,
        detectedCells: detected,
        detectionFraction: detected / data.dataset.nCells,
        meanLogExpression: totalLog / data.dataset.nCells,
        range: [0, max],
      },
      payload: {
        gene: data.genes[g],
        embedding: { name: "UMAP", points },
        range: [0, max],
      },
    };
  }
}
