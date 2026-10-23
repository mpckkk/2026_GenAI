# Soybean root annotation: evidence, method and limits

Celloras now runs an actual, deterministic annotation engine over the imported soybean root counts. It proposes cell identities, shows each candidate's supporting and contrary expression evidence, and abstains when its fixed evidence rules are not met. It requires researcher review. These suggestions are not validated biological identities or model-generated confidence percentages.

## Verified reference

The reference is the **literature-derived panel's Root column in Table S2** of Zhang et al., [A spatially resolved multi-omic single-cell atlas of soybean development](https://doi.org/10.1016/j.cell.2024.10.050). The [actual publisher workbook](https://ars.els-cdn.com/content/image/1-s2.0-S009286742401273X-mmc2.xlsx) is 517,637 bytes, SHA256 `18de89ddb0a729738e061df52f1966b952ecc0d03fa86243f500d5775233a616`. The importer checks the pinned bytes, ZIP signature, table title, column headers and extracted counts. Challenge HTML is not a spreadsheet.

The source contains 42 root-specific literature rows, 41 distinct genes and nine labels: Cortex, Endodermis, Epidermis, Pericycle, Phloem, Procambium, Root cap, Root hair and Xylem. Two rows associate the same gene, `Glyma.02G003700`, with Pericycle; the engine counts that gene once and preserves both row references.

The source [Methods P64](https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/#P64) reports Williams 82 v4 for the study's transcriptome alignment. These authors applied the Table S2 exact gene identifiers and root assignments to that analysis. All 41 distinct genes occur exactly in our Wm82v4 dataset. This is a compatible reference from that study, **not a universal mapping from the older marker collection**. The existing older-build reference remains a different source. No IDs are guessed, renamed or matched by symbol. The scientific provider's already documented literal `ann1.` display alias is retained alongside the source identifier.

Original expected labels, root-specific assignments, marker names, source species, orthology types, original references and spreadsheet rows are preserved. Some markers derive from Arabidopsis orthology and some from soybean studies. Importing the authors' mapping does not independently validate ortholog function in soybean. The [source annotation method](https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/#P69) explains their manual marker and biological-process assessment; our numerical method below is a separate, explicitly named exploratory method.

The source's additional 330 de-novo root marker rows are retained as factual corroboration metadata. **They are never used in the scoring.** Published barcode labels from Table S1 are stored in a separate benchmark file that the runtime engine does not import.

## Numerical method

`MarkerAnnotationEngine` depends on the provider-neutral `ScientificData` interface. It requests real `inspect` and single-gene `dotplot` results; it does not read private provider internals or recalculate an embedding. A missing exact feature is recorded as missing evidence. Provider failures stop the analysis. Species, tissue and genome build must match the reference exactly.

1. Reuse the scientific provider's explicit RNA transform: `log1p(raw_count / per_nucleus_total * 10,000)`. Means include zeros. The source `RNA.data` duplicates raw counts and is not treated as normalized data.
2. For each reference gene, calculate its population z-score across all cluster mean expressions. A constant gene receives zero. All clusters provide the comparison context, even when the researcher requests just one cluster.
3. For each cell type, sum available marker z-scores and divide by the number of distinct reference genes. Missing features contribute zero. This descriptive score is not a probability, confidence estimate, p-value or fold change.
4. A supporting gene requires detection in at least 10% of the cluster, cluster-minus-rest mean log expression of at least 0.1 and z-score at least 0.5.
5. Contrary enrichment requires mean difference at most −0.1, z-score at most −0.5 and detection in at least 10% of the remaining nuclei. This describes enrichment elsewhere, not proof that the identity is impossible. Other genes remain explicitly uninformative; low detection or absence alone is not treated as contradictory.
6. A candidate needs at least two distinct supporting genes, at least half its reference genes available and mean score at least 0.5. A competing candidate with at least one supporting gene within 0.25 score units, or a higher-scoring insufficiently supported candidate, prevents a single suggestion. If no candidate qualifies, the cluster remains unresolved.

The thresholds are fixed exploratory rules, not tuned statistical cutoffs. There is no batch or replicate adjustment, label transfer, per-nucleus classification or differential-expression significance test. Small clusters receive an explicit caution. The model can explain the computed output but cannot supply or alter its values. Saved researcher decisions are separate from the evidence snapshot.

## Observed acceptance and retrospective evaluation

The engine was run against the actual 7,496-nucleus, 40,127-gene, 12-cluster GSE270392 root artifact, version `02f079834ad067c47b77e1e34c86501d783fa78fc1797c7aa7f8ab23c13bbda5`.

An independent base-R calculation reads the original deposited sparse object in a pinned `r-base:4.6.1` container. It independently reconstructs the 41 reference genes' raw counts, per-nucleus totals, normalized means, detection, cluster-versus-rest differences and z-scores. **All 2,952 numerical comparisons passed** at a tolerance of `1e-10`; maximum observed absolute error was `2.9004576518332215e-15`.

The [actual Table S1 workbook](https://ars.els-cdn.com/content/image/1-s2.0-S009286742401273X-mmc1.xlsx), SHA256 `83f86cdeda3b566968ec84f6caf7be4ee133e5e445b1d16845b79ebbff6d7287`, contains biological labels absent from the deposited Seurat object's `celltype` field. All 7,496 source barcodes and their cluster assignments exactly match the imported data. These labels are used **only after prediction** for the following retrospective comparison:

| Cluster | Nuclei | Engine result                    | Leading candidate | Published label |
| ------- | -----: | -------------------------------- | ----------------- | --------------- |
| 0       |  2,027 | Unresolved                       | Cortex            | Cortex          |
| 1_0     |  1,115 | Suggested                        | Procambium        | Procambium      |
| 1_1     |    303 | Suggested                        | Pericycle         | Pericycle       |
| 2       |  1,333 | Suggested                        | Epidermis         | Epidermis       |
| 3       |    704 | Ambiguous                        | Epidermis         | Epidermis       |
| 4       |    502 | Suggested                        | Endodermis        | Endodermis      |
| 5       |    493 | Unresolved                       | Cortex            | Cortex          |
| 6       |    388 | Suggested                        | Root hair         | Root hair       |
| 7       |    349 | Suggested                        | Cortex            | Cortex          |
| 8_0     |    145 | Unresolved                       | Phloem            | Phloem          |
| 8_1     |    112 | Unresolved                       | Xylem             | Xylem           |
| 8_2     |     25 | Suggested; small-cluster caution | **Procambium**    | **Phloem**      |

Seven clusters receive suggestions, one remains ambiguous and four remain unresolved. Six of the seven suggestions agree with the study's labels; the leading candidate agrees for 11 of 12 clusters. The disagreement in cluster `8_2` is retained and documented, not silently corrected using the benchmark. Cluster 3 has competing epidermal and root-hair programs. The two reference Root cap genes have no observed counts here and do not yield a Root cap suggestion.

**This is not an independent accuracy estimate.** Reference selection and published labels come from the same study, and its curators had more evidence and context than this small marker panel. No held-out study, expert adjudication or performance on newly uploaded data has been demonstrated. Independent soybean reference evaluation is still needed before claims of reliable general annotation.

Additional real-data checks cover deterministic repeat results, identical selected-cluster versus all-cluster evidence, cancellation, invalid clusters, unavailable storage, missing datasets, duplicate reference association handling and a bounded model summary (approximately 16 KB for all 12 clusters). The reference importer was exercised against real publisher bytes. Detailed reports and full evidence remain in ignored `.artifacts/annotation/verification/`.

## Reproduce

The importer requires Node, `curl`, Python 3's standard library and the existing imported dataset; no extra application package or Python runtime service is added. It downloads the two pinned publisher workbooks, validates them and regenerates compact factual JSON. If publisher bytes change, it stops for source review.

```sh
node scripts/import-annotation-reference.mjs

# Explicitly reimport already downloaded and hash-verified source bytes:
node scripts/import-annotation-reference.mjs --source-dir .artifacts/annotation

# Real-data numerical and retrospective acceptance; requires Docker:
CELLORAS_DATASET_DIR=.artifacts/scientific-data node infra/science/verify-annotation.mjs
```

## Implementation ledger and integration order

| Action   | File                                                   | Purpose                                                                                 | Package |
| -------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------: |
| CREATE   | `infra/science/extract-annotation-reference.py`        | Strict publisher XLSX extraction and exact barcode alignment                            |       1 |
| CREATE   | `scripts/import-annotation-reference.mjs`              | Pinned source download, checksum verification and deterministic generation              |       1 |
| GENERATE | `data/references/soybean-annotation-v1.json`           | Factual root literature associations with source rows and separate unused corroboration |       1 |
| GENERATE | `data/references/soybean-root-label-benchmark-v1.json` | Separate source-label summary for retrospective acceptance only                         |       1 |
| CREATE   | `app/adapters/annotation-engine.mjs`                   | Deterministic numerical implementation consuming `ScientificData`                       |       2 |
| CREATE   | `app/adapters/annotation-engine.d.mts`                 | Typed provider boundary using `app/core/annotation.ts`                                  |       2 |
| CREATE   | `infra/science/verify-annotation.R`                    | Independent numerical acceptance from original sparse source                            |       3 |
| CREATE   | `infra/science/verify-annotation.mjs`                  | Real provider execution, failure checks and retrospective source-label report           |       3 |
| CREATE   | `docs/annotation-method.md`                            | Reference, explicit method, reproducibility and observed limits                         |       3 |

Deleted files: None. Renamed files: None. Core contracts, worker, owned persistence, chat actions and researcher review UI are the integration owner's separate work package.

Package 1 exits when real publisher workbooks match their pinned hashes and exact root barcode/cluster membership. Package 2 exits when every gene-level output derives from the verified scientific provider and thresholds distinguish suggested, ambiguous and unresolved outcomes. Package 3 exits when the independent R comparison and source-label report run successfully without hiding disagreements. The reference is additive; the older marker collection and existing immutable scientific artifacts are preserved.
