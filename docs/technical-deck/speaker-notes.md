# Celloras technical companion — speaker notes

## Slide 1

The browser authenticates through Keycloak. PostgreSQL stores owner-scoped jobs. The worker runs the server-side OpenShell/Codex agent, validates typed tool requests and saves canonical results. Scientific tools retrieve the reference through Zetaris and measure the count matrix outside the model. H-MEM supplies reviewed decisions as context at turn start. The model explains and recommends, and returns typed card/result IDs. The browser resolves only completed owned results. The diagram groups services by responsibility; it does not imply H-MEM is an external server or Zetaris runs the count matrix.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/analysis-tools.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/agent-response.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/architecture.md

## Slide 2

This is an actual authenticated agent conversation captured from celloras.com on 26 October 2026. No reply text, analysis result or map was fabricated. The agent was asked to show the saved annotation card and briefly explain it. It uses the existing React annotation card with computed cell-type suggestions and unresolved groups. Captured content is a cropped viewport of that actual turn. The underlying annotation was completed on 25 October. The screenshot shows the product interaction, not a fresh independent accuracy evaluation.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/(workspace)/app/annotation-card.tsx
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/agent-response.schema.json

## Slide 3

This separates measured data, marker associations, literature context and researcher interpretation. GSE270392 and soybean-atlas.com describe the same underlying published atlas and are not independent confirmation. The numeric panel includes associations originally supported by Arabidopsis orthology, with that provenance retained, but Celloras does not currently perform live ortholog mapping. The root/nodule paper is in the literature collection; its gene build is not automatically transferred to the Wm82v4 panel. Guide ingestion is abstract-only. SoyBase, broader nodule annotation and H5AD user uploads are planned/current implementation work, not active reference adapters. All count-matrix data stays numeric rather than being embedded as text.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/data/datasets/gse270392-root-rna-v1.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/data/references/soybean-annotation-v1.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/data/literature/soybean-v1.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/literature.md

## Slide 4

Official Zetaris hackathon self-hosted stack 2.4.3.1 runs on the Linux server in a separate Compose project. The app uses a dedicated SELECT-only account and private network API. CELLORAS.marker_reference_v1 is a Lightning filestore table over a mounted JSON array. The actual adapter runs fixed operator-owned SQL through /api/v1.0/query/sql/start, validates the pinned full canonical content SHA, closes the query cursor and saves a non-secret delivery receipt. The model cannot supply SQL. One pinned table is demonstrated, not multi-source federation or matrix ingestion. Public annotation run af2c9005-6be1-4f7c-baf4-dede8d06155c has query receipt f7fbb611-05df-4f96-83c8-efe2e60e8d32. SQL on the slide uses an explanatory placeholder for the pinned reference id.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/zetaris-reference.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/configuration.md

## Slide 5

The deterministic engine consumes compatible species, tissue and Wm82v4 data, never source cell labels. Means include zeros. It calculates across-group gene z-scores and divides the sum for available genes by each cell type reference gene count. Supporting genes must meet detection >=0.1, cluster-rest mean log delta >=0.1, and z>=0.5. A candidate requires at least two supporting genes, >=50% reference availability and score>=0.5. A competitor within 0.25 makes the result ambiguous. Group 6 is supported by Glyma.01G224900 and Glyma.17G030700. 2,952 independent base-R numerical comparisons passed within 1e-10. This checks implementation arithmetic, not general biological accuracy. The source-label comparison uses the same study; no independent benchmark has been demonstrated. The 25-nucleus group 8_2 disagreement remains visible. The dot plot is an actual stored analysis.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/annotation-engine.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/scientific-data.mjs

## Slide 6

Meterless official H-MEM reference revision 1742dec56a66e58eef9dda2d2b865823758ca8cd is vendored with its license and reproducible runtime. On an owned turn, Celloras synchronises explicit saved reviews, superseding only the same annotation-run/cluster or marker-entry target. The reference hashed embeddings and hybrid retrieval rank relevant records; exact named-group selection is application logic. Up to five memories reach the model with canonical source links. PostgreSQL retains the engine snapshot and append-only ledger. Memory is not paper retrieval or biological validation. Automatic mining, dreaming and semantic conflict resolution are disabled. All 13 upstream conformance checks passed; a real public review beyond 31 newer notes was recalled, and correction/account-isolation checks passed. Screenshot records the 25 October demonstration correction.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/research-memory.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/third_party/meterless-hmem/README.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md

## Slide 7

Keycloak handles login and credentials. The app enforces ownership before project/data/model/memory operations. Agent output must satisfy a JSON schema; cards reference canonical owned records, never arbitrary model-written HTML or fabricated chart payloads. The worker limits scientific tools to four per turn and saves JSON activity events with run identifiers. Failed/cancelled turns cannot expose completed result endpoints. The count matrix stays in numeric files, not a vector database. Curated literature currently uses lexical search, while H-MEM uses its reference hashed-embedding retrieval only for explicit reviews. NeMo Files and an NVIDIA observability dashboard are not active.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/analysis-tools.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/agent-response.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/agent-response.schema.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/research-memory.mjs

## Slide 8

The points are copied from the user-provided judging screenshot: Demo 15, Product & UX 10, Sponsor Tech 10. These are rubric weights, not awarded scores or an inferred complete rubric. The user supplied updated submission instructions requiring only Zetaris and a Meterless Engine in a working feature, with Cursor and NVIDIA optional. Celloras uses Zetaris, Meterless H-MEM and NVIDIA OpenShell. It does not claim Cursor usage, a working Nemotron call or an NVIDIA observability dashboard. Recorded public acceptance used the same project for annotation, real reference receipt, supporting gene plot, saved review and corrected recall. The current video is still to be recorded. The prepared workflow script resumes saved verified turns; replay is not a new benchmark or fresh inference for every step.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md

## Slide 9

Status at the technical-deck audit, 26 October 2026. H5AD implementation has started but was not verified or deployed when this deck was generated. Actual remote inspection of the author-published SOTA Root.scRNA.h5ad found 10,198 cells, 49,277 SoyZH13 genes, dense non-integer X, log1p metadata and no raw/count layers. It is unsuitable for our current raw-count/Wm82v4 workflow. The selected demo input is a transparent lossless H5AD conversion of the verified published GSE270392 root counts, groups and UMAP, retaining the original RDS SHA provenance. This is genuine published soybean data in a converted format, not an author-supplied H5AD. Existing functionality uses a pre-imported published dataset and small marker CSV lists. Raw FASTQ processing, arbitrary QC/batch correction/reclustering/new UMAP, automatic gene-build transfer and other plants are not demonstrated. The complete prepared public workflow passed, but broader local freeform tests have intermittent agent_execution_failed on the MicroVM runtime. Video recording, deck review and a final public smoke check remain before submission. Interface stubs for NeMo Files, Vercel gateway and NVIDIA tracing are not working integrations.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/dataset-import.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/configuration.md
https://db.cngb.org/stomics/soybean/download/

