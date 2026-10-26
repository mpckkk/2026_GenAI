# Soybean RNA dataset import

The first connected dataset is the published **GSE270392 soybean root single-nucleus RNA object**: 7,496 nuclei, 40,127 RNA features and 12 published clusters. Its existing UMAP is displayed without recalculation. The source's `celltype` values are identifiers such as `RNA_6`, **not biological cell-type annotations**.

- Dataset ID: `gse270392-root-rna-v1`
- Species: `glycine-max` / _Glycine max_
- Tissue: root; source samples `rt3` and `rt4`
- Genome: `Wm82v4`, as reported by the [source paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/). No cross-build mapping is performed.
- [Original GEO file](https://ftp.ncbi.nlm.nih.gov/geo/series/GSE270nnn/GSE270392/suppl/GSE270392_Gm_atlas_Root.rna.seurat.obj.rds.gz): 297,427,600 bytes.
- Source SHA-256: `7d30e826e09ef7d1b1cedeca04272caccfa75d49cabfbe0899f0dbfbb900fdd7`.

## Import and storage

Run from the repository root with Node 22 and Docker available. Download the source to a local file, then provide its path explicitly:

```sh
node scripts/import-dataset.mjs \
  --source /absolute/path/GSE270392_Gm_atlas_Root.rna.seurat.obj.rds.gz \
  --directory /absolute/path/celloras-datasets
```

The importer verifies the curated source checksum before reading scientific values. The deposited file has two gzip layers: the importer unwraps the outer layer, and R reads the internally compressed RDS. A pinned `r-base:4.6.1` container runs without network access, limited to one CPU and 3 GiB memory. It accesses the original S4 attributes without installing Seurat or running a new analysis.

The output is a versioned, checksummed **local sparse artifact bundle**, not a text embedding or a database row containing the matrix. Each dataset directory contains:

| Artifact                                                                 | Purpose                                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `source/original.rds.gz`                                                 | Unmodified deposited bytes, including all assays, residuals, graphs, metadata and processing commands. |
| `source/cells.csv`, `pca.csv`, `harmony.csv`, `umap.csv`, `commands.txt` | Preserved author metadata, aligned coordinates and saved processing calls.                             |
| `rna-counts/`, `sct-counts/`                                             | Gene-indexed sparse original RNA counts and author-corrected SCT counts.                               |
| `embedding.json`, `clusters.json`                                        | Cell IDs, source sample IDs, source cluster labels and all UMAP coordinates.                           |
| `library-sums.bin`, `sum-counts.bin`, `sum-log.bin`, `detected.bin`      | Checked, reproducible aggregates for fast numerical operations.                                        |
| `source/reference-checks.csv`                                            | Independent R calculations from the original object for cross-checking Node results.                   |
| `manifest.json`                                                          | Source, file hashes and sizes, assay semantics, importer version and numerical verification results.   |

Sparse matrices use a gene-major layout: `gene-pointers.bin` and `cell-indices.bin` are little-endian unsigned 32-bit integers; `values.bin` is little-endian float64. A gene's pointer range selects its cell indices and original values; missing entries are zero. `genes.json` records both `sourceGeneId` and `geneId`. Aggregate arrays have shape **genes × clusters**, in `genes.json` and `clusters.json` order. Log/count sums use float64; detection counts use uint32.

The only alias rule removes the literal `ann1.` prefix. `ann1.Glyma.16G071500` and `Glyma.16G071500` resolve to the same source feature. Matching is case-sensitive. Symbols, orthologues and gene IDs from other builds are not guessed.

The manifest SHA-256 becomes `dataset.artifactVersion`. `catalog.json` pins that hash. The adapter verifies the manifest and every artifact checksum, including the original RDS, before the first use. Later calls detect changed sizes/modification times and fail rather than reuse stale cached values. Import refuses to overwrite an existing dataset ID. Use a new version ID for changed source data or scientific semantics; run one importer at a time. Failed staging remains in `.import-*` for diagnosis and is not published in the catalog.

Keep the store outside Git and Docker build contexts. Mount it read-only into the app and agent worker and explicitly set:

```sh
CELLORAS_DATASET_DIR=/datasets
```

The runtime requires only Node built-ins. Docker/R are import-time dependencies. The selected numerical backend is **local CPU sparse analysis**, not an automatic GPU fallback. Missing configuration, damaged files and unsupported IDs fail explicitly. The calling server/worker must enforce project ownership before exposing or persisting a result.

## Scientific operations

`LocalScientificData` implements `health()`, `catalog()` and `run({ datasetId, operation, cluster?, genes?, signal? })`; shared result types live in `app/core/scientific-data.ts`. Each result has a compact `summary` for model context and a complete `payload` for server-stored plots. Cell arrays should not be inserted into model prompts.

| Operation    | Calculation and limits                                                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `inspect`    | Returns all 7,496 existing UMAP points, sample IDs, 12 cluster sizes and assay semantics. The recommended starting cluster is the largest group, a navigation choice rather than a scientific conclusion.                                                                                                                                  |
| `markers`    | Requires a real cluster ID. Returns up to 30 genes with positive cluster-versus-rest differences in mean `log1p(raw_count / raw_cell_total × 10000)`, detected in at least 10% of the selected cluster. This is **descriptive candidate ranking**, without statistical tests, p-values, FDR, replicate adjustment or cell-type confidence. |
| `expression` | Requires one exact gene ID. Returns its original counts and the explicit log1p counts-per-10,000 transformation for every nucleus, aligned to the source UMAP.                                                                                                                                                                             |
| `dotplot`    | Requires 1–12 unique exact gene IDs. Returns all cluster/gene combinations: mean transformed expression, fraction with raw count above zero and mean raw count. Means include zeros.                                                                                                                                                       |

The source **RNA `data` slot is identical to raw `counts`**; treating it as log-normalized would be incorrect. The source SCT assay has 23,775 features. Its corrected counts remain separate, and every exported SCT `data` value was checked against `log1p(SCT counts)`. The 3,320 × 7,496 SCT residual matrix is retained in the original RDS but is not exposed by these operations. No source matrix is overwritten or renormalized in place.

The current annotation panel uses 41 exact Wm82v4 genes from the authors' root reference, delivered through Zetaris in production. The separate legacy root/nodule lookup uses `Glycine_max_v2.1.52`; generated genes must not be silently matched across those builds. See [annotation methods](annotation-method.md) and [reference scope](soybean-reference.md).

## Verification against the real data

```sh
CELLORAS_DATASET_DIR=/absolute/path/celloras-datasets \
  node infra/science/verify-dataset.mjs
```

Observed on 2026-10-23:

- Source RNA: **11,480,487 stored nonzero values**, **16,620,589 total counts**. Every cell's raw sum and detected-gene count matched the deposited metadata.
- Import compared 72 original-R gene/cluster rows across four metrics: **288 independent reference comparisons**, maximum absolute difference **1.6653345369377348e-16**.
- Source SCT `data` versus log1p corrected counts: maximum absolute difference **8.881784197001252e-16**.
- Runtime verification exercised all four operations, all 12 clusters, six source-prefix aliases and all 7,496 points per expression overlay. The leading gene for each cluster reproduced its ranking score from per-cell expression.
- Unknown genes, unknown clusters, cancellation and unavailable storage returned explicit typed errors.
- Imported manifest version: `02f079834ad067c47b77e1e34c86501d783fa78fc1797c7aa7f8ab23c13bbda5`.

Local evidence logs are `.artifacts/source-audit/validated-dataset-import.log` and `.artifacts/source-audit/dataset-adapter-verification.log`. These numerical checks do not prove biological annotation accuracy; no annotation has been inferred by the importer.
