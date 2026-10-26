# Soybean H5AD demo input

Use `soybean-root-gse270392.h5ad` for the upload demo. It contains **7,496 real soybean root nuclei, 40,127 RNA genes, 11,480,487 nonzero counts and 12 existing groups**. The file is 28,919,346 bytes (27.6 MiB) in the verified build.

This is a transparent format conversion of the published GSE270392 root RDS, not an H5AD deposited by the authors. All raw RNA counts, cell IDs, original UMAP coordinates, group IDs and sample IDs are preserved. No cells, measurements, embeddings or cell-type labels are generated. The original source gene IDs are retained; the index uses the existing verified alias that removes only the literal `ann1.` prefix.

- [Original published RDS](https://ftp.ncbi.nlm.nih.gov/geo/series/GSE270nnn/GSE270392/suppl/GSE270392_Gm_atlas_Root.rna.seurat.obj.rds.gz)
- [Source study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/)
- Original RDS SHA-256: `7d30e826e09ef7d1b1cedeca04272caccfa75d49cabfbe0899f0dbfbb900fdd7`
- Verified sparse bundle manifest SHA-256: `02f079834ad067c47b77e1e34c86501d783fa78fc1797c7aa7f8ab23c13bbda5`
- Demo H5AD SHA-256 observed on 2026-10-26: `f4c9395d190ce8e073e36ee531664c82e8bd7adaf9b29dfe64fa593088c74890`. HDF5 library versions can change physical file bytes; regenerated files get their own receipt. Numerical parity is independently checked.

## Reproduce the actual file

First import the original RDS with the existing documented `npm run data:import` workflow. Then, with Python 3.12:

```sh
python3.12 -m venv .artifacts/h5ad-python
.artifacts/h5ad-python/bin/pip install --only-binary=:all: -r infra/science/h5ad/requirements-demo.txt
.artifacts/h5ad-python/bin/python scripts/prepare-h5ad-demo.py \
  --bundle .artifacts/scientific-data/gse270392-root-rna-v1 \
  --output .artifacts/h5ad-validation/soybean-root-gse270392.h5ad
```

The script verifies every source bundle checksum before reading, writes an ordinary AnnData H5AD, then reads it back with AnnData and proves exact counts, gene/cell order and UMAP. It writes a receipt beside the file. The H5AD embeds source provenance in `uns/celloras_provenance`. Production imports preserve the complete original H5AD and its checksum; metadata declared by an uploader is not promoted to independently verified publication provenance.

Choose these fields after uploading:

| Field                  | Choice                                            |
| ---------------------- | ------------------------------------------------- |
| RNA count matrix       | `X`                                               |
| Gene identifiers       | Gene index (`_index`)                             |
| Cell groups            | `seurat_clusters`                                 |
| Cell map               | `X_umap`                                          |
| Plant                  | Soybean (`glycine-max`)                           |
| Tissue                 | `root`                                            |
| Genome build           | `Wm82v4`                                          |
| Raw-count confirmation | Confirm: `X` contains original raw RNA UMI counts |

The original `rt3`/`rt4` sample IDs remain in the source H5AD. The current upload form does not expose a sample-column selector, so imported map records use the explicit sample value `uploaded`; no sample or batch identities are inferred.

The group IDs identify the authors' existing groups; they are not new annotation results. Run Celloras annotation after import to calculate candidates and inspect the gene evidence. This input is a processed count dataset, **not raw sequencing reads**. Import does not implement FASTQ alignment, QC, new clustering or UMAP.

## Why not use the other native soybean H5AD?

The [SOTA download page](https://db.cngb.org/stomics/soybean/download/) links [Root.scRNA.h5ad](https://ftp.cngb.org/pub/SciRAID/stomics/STDS0000168/scRNA/Root.scRNA.h5ad), a real downloadable 2,113,535,997-byte file. Inspection of actual HDF5 metadata and the first two expression rows on 2026-10-26 found:

- 10,198 cells × 49,277 genes; dense float32 `X`.
- No `raw` group and no matrices in `layers`.
- All 7,068 sampled nonzero expression values were fractional; `uns/log1p` is present.
- Gene identifiers start with `SoyZH13-`, not the Wm82v4 `Glyma` IDs used by the current marker panel.
- Existing `cluster`, `celltype` and `obsm/umap` are present.

It is unsuitable as a **raw-count Wm82v4 annotation demo**. Normalized values must not be treated as raw counts, and cross-build gene mapping is not implemented. This is why the demo uses the verified raw count conversion above. The native file was inspected through HTTP range reads; it was not downloaded in full or validated as an entire dataset.

## Import contract and resource limits

The importer reads the [AnnData on-disk format](https://anndata.readthedocs.io/en/stable/fileformat-prose.html) directly with h5py. It supports CSR, CSC and bounded dense reading of explicitly selected `X`, `layers/<name>` or `raw/X`. It does not deserialize Python objects or run file-provided code.

- Max 100,000 cells, 100,000 genes, 100 million nonzero values and 100 groups; at least two groups and an existing two-dimensional UMAP are required.
- Raw counts must be finite, nonnegative integers. Every cell must have a positive total. Integer values alone do not prove raw-count semantics: the uploader must explicitly confirm the matrix.
- Gene and cell IDs must be unique. Gene aliases are not inferred. Duplicate sparse coordinates are rejected rather than silently summed.
- A complete HDF5 link audit rejects external/soft links, external/virtual datasets, custom filter plugins, oversized object graphs and excessive nesting before matrix reads.
- Matrix blocks are streamed without densifying sparse data. Output is gene-major sparse counts and per-group aggregates, with whole-file checksums and source H5AD retained.
- Unknown grouping strings are converted to stable internal `group-N` identifiers; exact originals remain `sourceValue`. They are not advertised as biological cell types.
- The service uses an unprivileged Python 3.12 container and bounded child processes (default 3 GiB and 900 seconds, within a 4 GiB service limit). A rejected or interrupted import is explicit; it never attaches a partial dataset.
- The worker joins project ownership before accessing each queued file and again in the atomic attachment transaction. Uploads and bundles are not added to the public scientific catalog.

Worker configuration: `DATABASE_URL`, `CELLORAS_UPLOAD_DIR`, `CELLORAS_UPLOADED_DATASET_DIR`, optionally `CELLORAS_H5AD_TIMEOUT_SECONDS` and `CELLORAS_H5AD_MEMORY_GIB`. The heartbeat file contains only status and a Unix `updatedAt` timestamp. `h5ad.job.started` / `h5ad.job.finished` logs include the upload ID and stage, not file contents or credentials.

## Numerical and boundary verification

Run against the actual generated file and original verified source bundle:

```sh
.artifacts/h5ad-python/bin/python infra/science/h5ad/verify_import.py \
  --source .artifacts/h5ad-validation/soybean-root-gse270392.h5ad \
  --bundle .artifacts/scientific-data/gse270392-root-rna-v1 \
  --output .artifacts/h5ad-verification
```

Observed full-source import: all 11,480,487 raw values and cell indices, 40,128 gene pointers, 7,496 library sums, 481,524 group count sums and 481,524 detection counts matched exactly. All 7,496 original UMAP points matched exactly. The largest difference across 481,524 log-normalized aggregate values was `9.094947017729282e-13` (Python/JavaScript floating-point arithmetic).

The commissioning command also imports actual source cells using CSC and dense encodings and rejects normalized counts, missing UMAP, duplicate gene IDs, duplicate sparse coordinates, external links, soft links and virtual datasets. It writes the observed results to `verification.json`. This numerical check does not establish biological accuracy or constitute a browser/production workflow check; those are recorded separately in `docs/verification.md`.
