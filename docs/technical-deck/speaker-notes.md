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

This separates measured data, marker associations, literature context and researcher interpretation. GSE270392 and soybean-atlas.com describe the same underlying published atlas and are not independent confirmation. The numeric panel includes associations originally supported by Arabidopsis orthology, with that provenance retained, but Celloras does not currently perform live ortholog mapping. The root/nodule paper is in the literature collection; its gene build is not automatically transferred to the Wm82v4 panel. Guide ingestion is abstract-only. H5AD uploads now enter an owned inspection/import queue and retain the original counts and UMAP. The public uploaded-file workflow passed on 26 October. SoyBase and broader nodule annotation remain planned, not active reference adapters. All count-matrix data stays numeric rather than being embedded as text.

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

Keycloak handles login and credentials. The app enforces ownership before project/data/model/memory operations. Agent output must satisfy a JSON schema; cards reference canonical owned records, never arbitrary model-written HTML or fabricated chart payloads. The worker limits scientific tools to four per turn and saves JSON activity events with run identifiers. Failed/cancelled turns cannot expose completed result endpoints. H5AD uploads use checksummed 8 MiB chunks, PostgreSQL queue state and a bounded Python importer. The imported bundle is immutable and private to the owned experiment; the app and agent mount it read-only. The count matrix stays in numeric files, not a vector database. Curated literature currently uses lexical search, while H-MEM uses its reference hashed-embedding retrieval only for explicit reviews. NeMo Files and an NVIDIA observability dashboard are not active.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/analysis-tools.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/agent-response.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/agent-response.schema.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/research-memory.mjs

## Slide 8

The points are copied from the user-provided judging screenshot: Demo 15, Product & UX 10, Sponsor Tech 10. These are rubric weights, not awarded scores or an inferred complete rubric. The user supplied updated submission instructions requiring only Zetaris and a Meterless Engine in a working feature, with Cursor and NVIDIA optional. Celloras uses Zetaris, Meterless H-MEM and NVIDIA OpenShell. It does not claim Cursor usage, a working Nemotron call or an NVIDIA observability dashboard. The 26 October uploaded-file acceptance used the same project for H5AD upload, annotation, a real reference receipt, supporting gene plot, an illustrative saved review and H-MEM recall. The separate 25 October prepared workflow also proved correction recall. The current video is still to be recorded. The prepared workflow script resumes saved verified turns; replay is not a new benchmark or fresh inference for every step.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md

## Slide 9

Public upload workflow accepted on 26 October 2026, source release e153cf8. The real browser downloaded the verified 28,919,346-byte sample, uploaded and inspected it, explicitly selected raw counts/groups/UMAP and imported all 7,496 nuclei and 40,127 genes. The OpenShell/Codex agent annotated the owned dataset, returned its 7,496-cell map, compared two measured genes, and recalled a saved illustrative review through Meterless H-MEM. Annotation run f21b6943-c980-454b-8870-643773341ae9 retains Zetaris request e37392b3-f96d-4ee6-82e9-73fe75b301a2. The sample is a transparent lossless H5AD conversion of the published GSE270392 root RDS, not an author-deposited H5AD or raw sequencing reads. Native SOTA Root.scRNA.h5ad has normalized noninteger values and SoyZH13 IDs and is unsuitable for this Wm82v4 raw-count workflow. Limits include existing groups/UMAP and compatible soybean-root reference identifiers; no FASTQ processing, QC, new clustering, new embedding, automatic cross-build mapping or independent biological accuracy benchmark is claimed. The 4 GiB upload ceiling has not been load-tested. Broader local MicroVM freeform tests have shown intermittent execution failures, separate from this passing public Linux workflow. The video remains to be recorded.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/h5ad-source.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/configuration.md
https://celloras.com/app/projects/fd21eefc-6a63-4c06-89fd-007ed138c77f
