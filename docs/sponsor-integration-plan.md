# Sponsor integration — 2026-10-25

## Current requirement and runtime status, 2026-10-27

The latest organizer correction supplied by the user explicitly requires Nightshift as the AI provider, in addition to Zetaris and one Meterless Engine. This supersedes the older optional-Nightshift plan below.

Confirmed additions: `infra/nightshift/Dockerfile`, `infra/nightshift/config.toml`, `infra/nightshift/lanes.toml`, `infra/nightshift/compose.yaml`, and `infra/nightshift/README.md`. The official ARM64 runtime runs with userspace QEMU and a native Node engine on the existing x86_64 server. No privileged container, host emulation registration, published host port or laptop dependency is introduced. Vendor code remains unmodified and outside Git.

Sequence: verify the real API and auth boundary; configure an upstream provider; pass the existing structured inference probe; verify a fresh annotation and recall workflow; explicitly activate the adapter. The real API checks pass. Actual inference returns `no_provider_configured`, so activation remains blocked on a model API key. OpenShell remains active. No source files are deleted or renamed, and the private pitch planning file must remain untracked.


## Historical submission interpretation, 25 October

The user's latest submission instructions require **Zetaris and one Meterless Engine in a working feature**. Celloras uses **H-MEM** as that Engine. Cursor and NVIDIA are optional; there are no event credits to claim. Nightshift/Nemotron setup is optional work, not a submission blocker. This supersedes earlier interpretations of the Academy setup lesson. Preserve existing working OpenShell execution while prioritizing the two required integrations and their evidence.

Required deliverables: a 1–4 minute demo video, a slide deck covering problem/solution/architecture/sponsor use, a public GitHub repository with setup/usage/dependencies, and a sponsor explanation naming the Meterless Engine and a working test/demo. See [submission preparation](submission.md) and [sponsor explanation](sponsor-explanation.md).

### Submission documentation pass

| Action | Path                               | Purpose                                                                                     | Package |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------- | ------- |
| CREATE | `docs/sponsor-explanation.md`      | Exact sponsor roles, implemented boundaries, source links and observed proof                | S1      |
| CREATE | `docs/submission.md`               | Four deliverables, a timed recording outline, deck outline and one-workflow acceptance gate | S2      |
| UPDATE | `README.md`                        | Put required sponsor features and proof links ahead of optional work                        | S1      |
| UPDATE | `docs/demo.md`                     | Point presenters to the current soybean-root sponsor demonstration                          | S2      |
| UPDATE | `docs/configuration.md`            | Separate H-MEM requirements from optional Nightshift setup                                  | S1      |
| UPDATE | `docs/sponsor-integration-plan.md` | Record corrected requirements and this ledger                                               | S1      |
| UPDATE | `CHANGELOG.md`                     | Record documentation scope without claiming new runtime functionality                       | S2      |
| UPDATE | `learned.md`                       | Preserve the corrected sponsor requirement                                                  | S1      |

S1 reconciles the user's requirements against the source and recorded live acceptance; each sponsor claim needs a code pointer and actual result. S2 defines the continuous evidence → researcher review → recall → correction rehearsal and the video/deck content. Verify relative links and actual repository visibility/branch. No runtime changes, deletions or renames in this pass. The outline is not a completed recording or slide deck; both remain open deliverables. The next implementation work, if rehearsal exposes a gap, must have its own inspected file ledger and real acceptance check.

Implementation status on 25 October: H-MEM local and public acceptance complete (real browser/agent/DB, isolated source recall and correction); seven existing scientific/evidence journeys passed. Zetaris is installed on Linux with all nine vendor checks passed; its real adapter verifies the 42-record reference through a dedicated read-only account. It is selected in production, and a real public annotation completed with unchanged numerical results and saved Zetaris provenance. Optional Nightshift still needs runtime setup; Nemotron execution is not verified. OpenShell remains selected. Exact observations are in `docs/verification.md`.

## Outcome and boundaries

Connect sponsor capabilities to actual research work on the single `celloras.com` branch. H-MEM remembers explicit researcher decisions with provenance and project isolation. Zetaris supplies the same verified marker reference through its SQL API. Nightshift can run the existing bounded agent/tool loop through its OpenAI-compatible endpoint while OpenShell remains the default CLI runtime. Never label a configured provider as verified without a real call; Nightshift routing does not by itself prove Nemotron executed.

No changes to upload formats, annotation mathematics or authentication. Existing `.h5ad` ingestion remains separate unfinished work. Zetaris access is available and stored privately. Nightshift runtime access is still pending.

## File change ledger

### Earlier runtime activation work

The completed Zetaris activation followed this plan: install the supplied official bundle on the existing Linux server, with a separate Compose project, replaced bootstrap passwords, loopback-only administration ports and the API connected to Celloras's private Docker network. Keep the vendor bundle and credentials outside Git. Verify its actual API before selecting it in Celloras. A separate optional Nightshift installation attempt stopped when Computer Use could not launch its native installer; it is not required for the working H-MEM integration.

| Action | Path                                    | Change                                                                                | Package |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| UPDATE | `app/adapters/zetaris-reference.mjs`    | Explicit opt-in for HTTP on the operator's private Docker network; keep HTTPS default | A2      |
| UPDATE | `.env.example`                          | Document private transport selection, without credentials                             | A2      |
| UPDATE | `compose.yaml`                          | Pass the explicit private-transport setting to app and worker                         | A2      |
| UPDATE | `scripts/prepare-zetaris-reference.mjs` | Export a JSON array for the verified self-hosted file reader alongside the CSV        | A2      |
| UPDATE | `docs/configuration.md`                 | Installation, actual source registration and private-network activation               | A3      |
| UPDATE | `docs/verification.md`                  | Record real installation, SQL and application acceptance                              | A3      |
| UPDATE | `README.md`                             | Actual verified provider status                                                       | A3      |
| UPDATE | `docs/architecture.md`                  | Actual data boundary and remaining runtime work                                       | A3      |
| UPDATE | `CHANGELOG.md`                          | Delivered activation behavior                                                         | A3      |
| UPDATE | `learned.md`                            | Record discovered API and operational requirements                                    | A3      |

A1 installs and verifies the vendor stack with an authenticated real query. A2 connects the exact 42-record reference, verifies its content hash through the adapter, and proves the private HTTP opt-in is required. A3 activates only after A1/A2 pass, then exercises a real annotation conversation and its source receipt before recording deployment. No migrations, deletes or renames. Reverting provider selection is an explicit operator action; failures must never select another source automatically.

New paths below are deliberate additions. Existing caller paths have been inspected. Vendor source/output filenames are enumerated by the pinned import manifest, with the complete list added before generation.

| Action | Path                                       | Change                                                                                             | Package |
| ------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------- |
| CREATE | `docs/sponsor-integration-plan.md`         | Plan and acceptance gates                                                                          | 1       |
| CREATE | `scripts/vendor-hmem.mjs`                  | Reproducible pinned import/transpile with license and SHA manifest                                 | 1       |
| CREATE | `db/migrations/009_research_memory.sql`    | Owned project snapshot and append-only trust ledger                                                | 1       |
| CREATE | `app/adapters/research-memory.mjs`         | Canonical review ingestion, exact supersession, real H-MEM retrieval, transactional PG persistence | 1       |
| CREATE | `app/adapters/research-memory.d.mts`       | Typed ownership and retrieval boundary                                                             | 1       |
| CREATE | `app/core/memory.ts`                       | Provider-neutral request/receipt contracts                                                         | 1       |
| UPDATE | `app/adapters/memory.ts`                   | Replace throw-only adapter with owned H-MEM repository                                             | 1       |
| UPDATE | `app/core/tools.ts`                        | Replace insecure unused memory signature                                                           | 1       |
| UPDATE | `infra/agent/worker.mjs`                   | Recall decisions into immutable turn context; configurable providers and receipts                  | 1–3     |
| UPDATE | `app/adapters/chat.ts`                     | Return bounded memory provenance from owned context snapshots                                      | 1       |
| UPDATE | `app/core/chat.ts`                         | Memory receipt contract                                                                            | 1       |
| UPDATE | `app/(workspace)/app/agent-chat.tsx`       | Expandable recalled-decision sources                                                               | 1       |
| UPDATE | `app/(workspace)/app/workspace.module.css` | Subtle memory receipt styling                                                                      | 1       |
| UPDATE | `app/services/health.ts`                   | Probe implemented services; distinguish missing access from unavailable provider                   | 1–3     |
| UPDATE | `infra/agent/Dockerfile`                   | Ship runtime modules and vendor engine                                                             | 1–3     |
| UPDATE | `eslint.config.mjs`                        | Exclude unchanged/generated vendor code                                                            | 1       |
| UPDATE | `.prettierignore`                          | Preserve upstream bytes                                                                            | 1       |
| UPDATE | `tsconfig.json`                            | Exclude upstream reference TS from application compilation                                         | 1       |
| UPDATE | `scripts/verify-research-storage.mjs`      | Fresh and populated v8→v9 rehearsal                                                                | 1       |
| CREATE | `tests/research-memory.spec.ts`            | Real login, review, retrieval, persistence and isolation journey                                   | 1       |
| CREATE | `app/adapters/zetaris-reference.mjs`       | Bounded authenticated SQL query, cursor cleanup, exact reference verification                      | 2       |
| CREATE | `app/adapters/zetaris-reference.d.mts`     | Marker-reference adapter boundary                                                                  | 2       |
| UPDATE | `app/adapters/data.ts`                     | Replace obsolete throw-only boundary with selected reference adapter                               | 2       |
| UPDATE | `app/adapters/marker-reference.mjs`        | Inject a verified reference without changing evidence calculations                                 | 2       |
| UPDATE | `app/adapters/annotation-engine.mjs`       | Obtain reference through selected provider before numerical annotation                             | 2       |
| CREATE | `scripts/prepare-zetaris-reference.mjs`    | Export exact versioned reference for sponsor workspace ingestion                                   | 2       |
| CREATE | `app/gateway/nightshift.mjs`               | Bounded structured agent response, cancellation and actual provider receipts                       | 3       |
| CREATE | `app/gateway/nightshift.d.mts`             | Agent runtime contract                                                                             | 3       |
| UPDATE | `compose.yaml`                             | Explicit provider selection and server-only credentials                                            | 2–3     |
| UPDATE | `.env.example`                             | Document configuration with empty secrets                                                          | 2–3     |
| UPDATE | `README.md`                                | Working sponsor paths and access limitations                                                       | 4       |
| UPDATE | `docs/configuration.md`                    | Setup, readiness and provider switching                                                            | 4       |
| UPDATE | `docs/architecture.md`                     | Real boundaries and residual planned integrations                                                  | 4       |
| UPDATE | `docs/verification.md`                     | Actual checks and unverified remote contracts                                                      | 4       |
| UPDATE | `CHANGELOG.md`                             | Delivered behavior                                                                                 | 4       |
| UPDATE | `learned.md`                               | Contract and operational findings                                                                  | 4       |

Deleted/renamed files: none planned. Amend this ledger before changing scope.

### Additional affected files confirmed during adapter implementation

UPDATE `Dockerfile` (package 1): include the H-MEM license and attribution in the standalone app image; worker packaging includes both too.

| Action | Path                                      | Change                                             | Package |
| ------ | ----------------------------------------- | -------------------------------------------------- | ------- |
| CREATE | `scripts/verify-sponsors.mjs`             | Real query/inference activation probes             | 2–3     |
| UPDATE | `app/core/annotation.ts`                  | Reference transport and delivery receipt contracts | 2       |
| UPDATE | `app/core/evidence.ts`                    | Preserve marker delivery provenance                | 2       |
| UPDATE | `app/adapters/annotation-engine.d.mts`    | Typed reference loader                             | 2       |
| UPDATE | `app/adapters/marker-reference.d.mts`     | Typed atlas selection                              | 2       |
| UPDATE | `app/(workspace)/app/annotation-card.tsx` | Actual reference delivery in source details        | 2       |
| UPDATE | `app/(workspace)/app/evidence-card.tsx`   | Actual reference delivery in source details        | 2       |

## Ordered packages

1. **Durable research memory.** Vendor the Apache-2.0 H-MEM reference pinned to Meterless commit `1742dec56a66e58eef9dda2d2b865823758ca8cd`. Preserve upstream bytes/license. Run its conformance against generated runtime output, then real PostgreSQL/browser checks. Source only explicit owned reviews; use exact target identity for replacements. Disable automatic mining, dreaming, conflict resolution and forgetting in the application. A relevance score is not biological confidence. Retrieve at most five current decisions, persist audit and query trace atomically with turn claim, show source receipts. Exit: actual agent recalls an older saved decision, restart/reload preserves it, newer review wins, foreign owner is denied, migrations preserve records.
2. **Zetaris reference adapter.** Depends on verified local reference format. Official OpenAPI documents POST `/api/v1.0/query/sql/start`, GET `/api/v1.0/query/sql/page`, DELETE `/api/v1.0/query/sql/close/{queryToken}`, Bearer API token and X-Org-ID. Export a versioned reference; require returned content to match its known hash before lookup/annotation. Explicit local/Zetaris selection; no fallback. Exit: static/packaging checks and, when access exists, real query and scientific result provenance. Without access it remains unverified/pending, never ready.
3. **Nightshift runtime adapter.** Depends on the existing structured response parser and independently authorized tool broker. Official Runtime 0.90.0 uses `/v1/models`, `/v1/chat/completions`, actual proxy token, `meterless-app: celloras`, `meterless-scope: user`, and routing IDs such as `meterless/auto`. Bound output/time and validate before executing tools; never retry a failed inference automatically. Preserve OpenShell default and its independent sandbox cleanup. Record returned model, distinguish Nightshift transport from proven Nemotron route. Exit: configuration/packaging checks and actual agent request when runtime access exists.
4. **Delivery.** Run affected real journeys, lint/typecheck/build and migration rehearsal; inspect source-receipt UI. Push and deploy verified functionality, retaining explicit pending status for inaccessible services. Record receipts in repository and Amigospace. No resource/volume deletion.

## Rollout and risks

Add schema first, deploy app and worker together. Old workers can ignore additive memory tables. New memory writes do not alter canonical reviews or numerical results. Roll back application code without dropping memory/history. Vendor engine is a deterministic reference implementation with lightweight hashed embeddings, not a hosted scalable memory platform; per-project isolation and PG transactions supply durability here. Provider URLs and table identifiers are operator configuration, never model-controlled. Credentials remain in environment/deployment configuration. Account access is an external dependency; it is not acceptable to invent successful sponsor usage.

### Pinned H-MEM files (package 1)

CREATE `third_party/meterless-hmem/README.md`: upstream attribution and application policy boundaries.

| Action   | Path                                                          | Purpose                                               |
| -------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| CREATE   | `third_party/meterless-hmem/source/conflictDetection.ts`      | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/conflictDetection.mjs`    | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/dreaming.ts`               | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/dreaming.mjs`             | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/embeddings.ts`             | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/embeddings.mjs`           | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/index.ts`                  | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/index.mjs`                | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/memoryMining.ts`           | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/memoryMining.mjs`         | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/memoryRetrieval.ts`        | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/memoryRetrieval.mjs`      | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/memoryStore.ts`            | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/memoryStore.mjs`          | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/sleepCycle.ts`             | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/sleepCycle.mjs`           | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/trustLedger.ts`            | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/trustLedger.mjs`          | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/source/types.ts`                  | Unmodified pinned upstream bytes                      |
| GENERATE | `third_party/meterless-hmem/runtime/types.mjs`                | TypeScript transpilation by `scripts/vendor-hmem.mjs` |
| CREATE   | `third_party/meterless-hmem/LICENSE`                          | License, digest manifest or upstream acceptance       |
| GENERATE | `third_party/meterless-hmem/manifest.json`                    | License, digest manifest or upstream acceptance       |
| CREATE   | `third_party/meterless-hmem/conformance/runner.ts`            | License, digest manifest or upstream acceptance       |
| GENERATE | `third_party/meterless-hmem/conformance/runner.mjs`           | License, digest manifest or upstream acceptance       |
| CREATE   | `third_party/meterless-hmem/conformance/vectors/vectors.json` | License, digest manifest or upstream acceptance       |
