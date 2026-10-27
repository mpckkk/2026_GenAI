# Celloras engineering deck: speaker notes and implementation sources

Snapshot: 26 October 2026. These notes describe implemented contracts and distinguish observed acceptance from extension targets.

## 1. Deployment topology

This deployment topology shows the verified public Linux path. Traefik terminates TLS for app and Keycloak. PostgreSQL stores both job queues and durable research state. The Python importer claims its own jobs and writes immutable private files. The application and agent mount those files read-only. The Node worker invokes numerical tools and imports the Meterless H-MEM runtime in-process. OpenShell is one execution adapter, not the definition of Celloras agent orchestration. The public deployment uses OpenShell 0.1.5 and Codex CLI 0.163.0. The gateway holds the provider bearer credential, while the worker gets account/expiry metadata and mTLS access. Separate arrows are not intended as an exhaustive network ACL. Current infrastructure is a single Linux host with durable bind mounts and PostgreSQL storage.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/compose.yaml
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/compose.prod.yaml
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/architecture.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/configuration.md

## 2. Agent runtime interface

The working worker dispatches through a runtime object with health() and run({name,prompt,signal,progress}). This is the implemented JavaScript adapter boundary, shown in interface notation, not a claim that a formal TypeScript AgentRuntime declaration already exists. The shared AgentResponse schema carries tool requests and final card references. Both OpenShellCodex and NightshiftAgent implement this shape. Nightshift uses an HTTP API and proves the code architecture is not CLI-only, but its live acceptance is pending. Additional CLI and official OpenAI/Anthropic/OpenRouter/Vercel adapters are extension targets, not working integrations claimed by this deck. A new adapter must translate its provider output into AgentResponse, handle cancellation/progress and be added to the runtime selector. The browser cannot choose runtime, model or provider. Existing OpenShell cleanup leases retain their original runtime semantics when the configured runtime changes. OpenShell-specific remove() is lifecycle cleanup, not a required sandbox operation for an HTTP adapter. The VercelModelGateway is an explicit unavailable placeholder and is not on the verified chat path.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/agent-openshell.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/gateway/nightshift.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/agent-response.schema.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/gateway/vercel.ts

## 3. Turn execution and typed output

The first five boxes compress the turn loop. HTTP admission locks the owned project. The unique project/submission identity replays an identical request and conflicts on changed content. A partial index permits one queued/running turn per project. Claiming uses FOR UPDATE SKIP LOCKED, then snapshots completed conversation, project records, dataset handles and H-MEM recall. A suggested UI action may execute before the first model invocation, while freeform model output can request a typed scientific action. The broker authorizes ownership, active turn, cancellation and immutable artifact version before computation and persistence. It appends canonical result handles and invokes the runtime again. Each OpenShell model invocation creates and removes a fresh sandbox, so application context carries continuity. A final response must contain nonempty Markdown. Intermediate responses permit at most one tool request. There are at most four tools overall and at most one legacy marker lookup. Invalid or foreign card references fail the entire new response. Atomic completion stores the resolved response document and text projection only for the still-owned active turn. Completed-result endpoints exclude failed or cancelled originating turns. The UI polls about every 1.8 seconds rather than streaming model tokens. JSON on the slide illustrates the real schema with an explicit placeholder UUID.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/chat.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/agent-response.schema.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/analysis-tools.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/services/agent-response.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/(workspace)/app/agent-response.tsx

## 4. H5AD upload and import state machine

This custom resumable protocol creates an owned upload, accepts bounded binary PATCH chunks, then queues inspection with POST complete. Each chunk has a SHA-256 and exact expected offset. A stale offset returns 409. Writes lock project/upload rows, truncate bytes beyond the committed database offset, write and sync, then commit the new offset. The browser first/last-1-MiB fingerprint is only a resume identity check. Whole-file hashing occurs in the worker after completion and again before import. Explicit selection includes count matrix, gene column, grouping column, UMAP, species, tissue, genome build and rawCountsConfirmed. The independent Python worker claims with SKIP LOCKED. It rejects unsafe HDF5 links/filters, malformed sparse encodings, duplicate IDs/coordinates, noninteger/negative/nonfinite counts and zero library totals. It requires existing groups and 2D UMAP. A 900-second/3-GiB child process runs in a one-CPU/4-GiB container with a read-only root, 256-MiB tmpfs, dropped capabilities and no-new-privileges. Stale working states fail after timeout plus 60 seconds instead of replaying. File publication uses rename before the final PG attachment transaction, so a failure can leave an unbound artifact. This is not a distributed filesystem/database transaction.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/dataset-upload.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/dataset-upload.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/api/projects/[projectId]/dataset-uploads/[uploadId]/route.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/science/h5ad/worker.py
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/science/h5ad/importer.py
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/db/migrations/010_dataset_uploads.sql

## 5. Data model and ownership

PostgreSQL handles canonical records and authorization. The private scientific provider joins owned projects, attachments and ready upload records, requiring exact owner and manifest version. The private upload never joins the public dataset catalog. Artifact version is the manifest SHA. First bundle load verifies manifest, original source and all declared file sizes/hashes, then cached reads check file fingerprints. The provider caches at most two private bundles. Files include manifest.json, source/original.h5ad, source/selection.json, genes.json, uint32 gene pointers/cell indices, float64 raw values/library sums/group count and log sums, uint32 detected counts, clusters.json and embedding.json. The importer uses two matrix passes, block processing and memory-mapped gene-major outputs without densifying the entire sparse source. Raw counts remain numeric rather than text embeddings. App and worker mounts are read-only. Source counts, measurements and subsequent review decisions remain distinct. Source species/tissue/build/raw-count meaning are declared by the uploader and structurally checked, not independently biologically certified.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/db/migrations/003_agent_chat.sql
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/db/migrations/006_scientific_analysis.sql
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/db/migrations/007_annotation.sql
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/db/migrations/010_dataset_uploads.sql
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/project-scientific-data.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/scientific-data.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/science/h5ad/importer.py

## 6. Deterministic annotation pipeline

MarkerAnnotationEngine depends on ScientificData through inspect and per-gene dotplot operations. Exact species, tissue and genome build compatibility is required. The Wm82v4 soybean root panel contains 42 associations but 41 distinct genes across nine cell types. Duplicate gene associations preserve provenance but count once in a type score. The raw-count transformation uses a 10,000 library-size factor and log1p. All group means include zeros. Group gene z-scores use population standard deviation with equal group weighting. Group-versus-rest expression weighs cells. Missing reference features contribute zero to the score because the denominator retains the complete distinct-gene reference count. Contrary enrichment requires rest detection at least 10%, delta at most -0.1 and z at most -0.5. A candidate requires the gates shown. A competitor with at least one supporting gene within 0.25 score units, or an eligible winner below the overall leading candidate, makes the result ambiguous. With no eligible candidate the group remains unresolved. Published cell labels never enter runtime scoring. The model cannot overwrite measurements, but can reason about the result, recommend follow-up and explain uncertainty. This implementation has no batch adjustment, per-cell classifier, significance test or independent biological accuracy benchmark.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/annotation-engine.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/scientific-data.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## 7. Zetaris reference protocol

The full endpoints are POST /api/v1.0/query/sql/start and DELETE /api/v1.0/query/sql/close/{queryToken}. The adapter sends bearer authentication, organization ID and an application-generated X-Request-ID, not a server-signed attestation. The table is operator-configured. The reference ID comes from the pinned, verified application reference. Model output never supplies SQL. The adapter requires a token, totalCount 42 and exactly one complete page, sorts records, verifies contiguous indexes, checks each declared document hash and reconstructs/rehashes the full reference. There is no cursor pagination. The API response bound is 1 MiB, query timeout 15 seconds, cleanup timeout 5 seconds, redirects rejected. Cleanup runs once a token is available; truncated/unparseable replies may prevent token extraction. Any validation, provider or cleanup failure stops the operation with no provider fallback. HTTPS is default, with explicit private-network HTTP opt-in for the separate self-hosted Zetaris 2.4.3.1 stack. Current integration reads one versioned Lightning filestore reference table, not full atlas federation or researcher matrix storage. The reference health check also runs during turn claim, so a Zetaris outage can block ordinary chat admission/execution beyond just annotation.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/zetaris-reference.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/scripts/prepare-zetaris-reference.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/annotation-engine.mjs
https://github.com/mpckkk/2026_GenAI/tree/celloras.com#how-we-use-the-sponsor-technology

## 8. Meterless H-MEM state and retrieval

The actual upstream Meterless H-MEM runtime is vendored at revision 1742dec56a66e58eef9dda2d2b865823758ca8cd and imported as ES2022 modules in the existing Node worker. It is not an external hosted memory service. On owned turn claim the adapter checks project/owner/active-turn predicates, locks project memory state, validates the engine revision, restores state and syncs explicit saved reviews. Supersession applies only to the same annotation run plus group or the same marker-entry target. Canonical tables retain all reviews, including ones superseded before H-MEM next ran. The adapter prevents upstream semantic correction guesses from superseding unrelated targets. Retrieval uses the upstream deterministic 64-dimensional token-hash embedder plus keyword/entity/tag/domain/layer/recency factors. Named-group filters use threshold zero; general hybrid retrieval uses 0.2. Maximum five memories enter the snapshot with source IDs and URLs. State, new ledger rows and the recalled context commit with the turn claim. The ledger trigger prohibits UPDATE/DELETE. Explicit review corrections do not mutate numeric results or old answer snapshots. Limits are 2,000 current targets, 10,000 stored records and 24,000 query characters. Automatic mining, dreaming, sleep and semantic conflict resolution are disabled. State-version migration is not automatic.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/research-memory.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/third_party/meterless-hmem/runtime/index.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/third_party/meterless-hmem/manifest.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/db/migrations/009_research_memory.sql
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs

## 9. Failure handling and observability

Worker heartbeat runs every three seconds. New admissions require a ready worker heartbeat under 30 seconds old. A stale running turn fails after 60 seconds. Database loss aborts execution. OpenShell sandbox execution is bounded to 180 seconds and output is bounded. Cleanup failure retains sandbox_name and blocks the project until exact deletion succeeds. Historical cleanup continues through OpenShell even if the current runtime selector changes. Failed or cancelled turns get neither response_document nor response_text, and completed-result endpoints exclude their numerical artifacts. Those artifacts may remain internal audit records. Explicit retry creates a new model turn; uncertain HTTP retries preserve the original identity. Importer jobs have their own timeout/recovery boundary and never automatically re-import a stale job. Logs are structured JSON correlation events. Application health is not proof of successful inference. OpenTelemetry dashboards, distributed tracing and production alerting are not implemented by this flow. Reference availability during turn claim currently couples ordinary chat to Zetaris health, an explicit reliability tradeoff.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/agent/worker.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/chat.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/agent-openshell.mjs
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/adapters/dataset-upload.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/infra/science/h5ad/worker.py
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/architecture.md

## 10. Measured coverage and scaling limits

The tracked receipt docs/evidence/h5ad-public-2026-10-26.json links upload e3c86263-e5aa-4af6-9475-a0858c0d7ba0, annotation run f21b6943-c980-454b-8870-643773341ae9, Zetaris application request e37392b3-f96d-4ee6-82e9-73fe75b301a2 and H-MEM review source annotation-review:272f903e-e478-4bec-a57f-60d9380288fb in the same owned experiment. The 28,919,346-byte sample is a transparent lossless conversion of GSE270392 root RDS, not raw FASTQ or an author-deposited H5AD. All 11,480,487 raw nonzero values and 7,496 coordinates/groups survived import. The numerical engine independently matched 2,952 R comparisons within 1e-10. This checks arithmetic, not scientific generalization. Result: seven suggested groups, one ambiguous and four unresolved. The illustrative saved review left computed evidence unchanged. Separate checks cover stale offsets, chunk SHA failures, foreign ownership, resume and an uncommitted 34-byte tail. Configured caps are 4 GiB upload, 100,000 cells, 100,000 genes and 100 million nonzeros, not measured capacity. The importer uses one CPU/four-GiB container and the runtime worker processes sequentially in each process. SQL SKIP LOCKED is a concurrency primitive, not proof of multi-worker throughput. Horizontal deployment would need shared artifact storage, coordinated runtime configuration, capacity scheduling and load acceptance. New plants need compatible reference/data adapters and source validation, not just changing a display name.

Implementation sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/evidence/h5ad-public-2026-10-26.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/h5ad-source.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/scientific-data.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/app/core/annotation.ts
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/architecture.md
