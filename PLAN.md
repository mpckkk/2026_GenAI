# Celloras implementation record

## Ready-to-use local demo — 2026-10-23

Complete locally: both examples contain actual agent evidence, the root review is saved, and a fresh-login replay preserved all IDs/counts. Desktop/mobile screenshots and source/follow-up interactions were checked; lint/format passed. Existing chat history remains intact. See `docs/demo.md` and `docs/verification.md`.

Outcome: the existing demo account opens prepared soybean examples with real source-backed agent responses, a saved illustrative review, and a short presentation path. The account currently has one experiment and two chat messages but no sample or marker entries. Preserve these records. Use the existing authenticated HTTP APIs and real OpenShell worker; never insert assistant replies or scientific results directly.

| Action | Path                         | Change                                                                                                                                                                             | Package |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| CREATE | `scripts/prepare-demo.mjs`   | Sign in through Keycloak, append named/versioned example context/markers/notes, request real evidence, save a clearly labeled example review, verify UI and emit links/screenshots | 1       |
| CREATE | `data/demo-experiments.json` | Root match and ambiguous-nodule example inputs with explicit illustrative-data labels, stable submission keys and presentation prompts                                             | 1       |
| UPDATE | `package.json`               | Expose `demo:prepare`                                                                                                                                                              | 1       |
| CREATE | `docs/demo.md`               | Two-minute presentation path, prompts, setup/retry contract and truthful scope                                                                                                     | 2       |
| UPDATE | `README.md`                  | Link the prepared demo workflow                                                                                                                                                    | 2       |
| UPDATE | `CHANGELOG.md`               | Record demo preparation capability                                                                                                                                                 | 2       |
| UPDATE | `docs/verification.md`       | Record real login, agent execution, replay and desktop/mobile observations                                                                                                         | 2       |
| UPDATE | `learned.md`                 | Record the demo-data and replay requirements                                                                                                                                       | 2       |
| UPDATE | `PLAN.md`                    | Scope, ledger and observed completion                                                                                                                                              | 1–2     |

No deletions or renames. No auth bypass, new schema, product runtime change, or replacement of existing research. Credentials stay in environment variables and never enter source, logs, screenshots or Amigospace. Local preparation records identifiers in ignored artifacts; fixed research/chat submission IDs permit replay without duplicating content or rerunning inference. An ambiguous project-create response stops for reconciliation rather than retrying blindly.

1. Implement and run the small local preparation script through actual login/APIs. Reuse the uniquely named `Soybean demo` project; add a separate `Soybean nodule demo` project. Read actual persisted evidence before saving an explicitly illustrative provisional root review; leave the nodule decision open for the user. Exit: both real runs complete and their cards/source links render.
2. Verify a fresh login, desktop/mobile cards, saved review and draft-preserving follow-up; rerun preparation and confirm identical project/record/turn counts. Inspect screenshots, lint/format the changed scripts/config/docs, record limits, push on `celloras.com` and save the direct demo links in Amigospace. No broad app rebuild is needed because product runtime code is unchanged.

## Soybean marker evidence and review — 2026-10-23

Implementation and local acceptance are complete. The production app/worker and evidence workload are active; six real evidence journeys and nine existing browser regressions passed. Fresh/populated migration rehearsals preserved existing data, and source compatibility, ownership, review retries, long-history links and mobile layout were exercised. See `docs/verification.md` for observed evidence and limits. Delivery uses the sole `celloras.com` branch and the existing Amigospace wave record.

Outcome: a researcher saves a soybean marker set and asks the connected agent to look up evidence. The agent requests an allowlisted read tool; the worker resolves the owned immutable marker/context, matches a versioned published reference, persists its provenance, then asks the model to explain that real result. A predefined evidence card shows matches/candidates, ambiguity and unmatched IDs. The researcher explicitly saves a candidate or an unresolved/rejected decision linked to the exact run. No confidence probabilities or validated annotation claims.

Source decision: begin with factual gene/cell-type associations explicitly reported in Cervantes-Pérez et al. 2024, DOI 10.1016/j.xplc.2024.100984, Methods “Cell type annotation using M.C.”, root/nodule paragraphs p0230/p0235. Source transcriptome build is Glycine_max_v2.1.52. Preserve source labels, source paragraph and sample stage. Exclude symbols without explicit ID mappings and the malformed Glyma.15G2100100; never silently correct it. Limited reference coverage must be visible. The Zhang atlas Table S2 download returned a browser challenge; do not claim its ingestion. Raw atlas counts are not substitute marker calls. This is retrieval assistance, not a calibrated classifier. No matrix analysis, uploads, cross-species transfer or additional model providers in this wave.

Current → target: owned research records → bounded model context → structured tool request → independent ownership/catalog check → explicit reference adapter → persisted evidence snapshot → grounded final model response → resolved evidence card → researcher-authored review via existing idempotent research API.

### File change ledger

The ledger records the implemented additions and updates. No deletes or renames.

| Action   | Path                                                | Change / reason                                                                       | Package |
| -------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| CREATE   | `scripts/import-soybean-reference.py`               | Deterministic primary-source fact extraction with provenance and rejected identifiers | 1       |
| GENERATE | `data/references/soybean-root-nodule-2024.json`     | Versioned factual marker reference generated by importer                              | 1       |
| CREATE   | `docs/soybean-reference.md`                         | Source, method, scope, restrictions, exact example IDs and honest evaluation limits   | 1       |
| CREATE   | `app/core/evidence.ts`                              | Species-neutral reference/result/review contracts                                     | 1       |
| CREATE   | `app/adapters/marker-reference.mjs`                 | Explicit configured source lookup with tissue/build/namespace checks                  | 1       |
| CREATE   | `app/adapters/marker-reference.d.mts`               | Typed source boundary                                                                 | 1       |
| CREATE   | `db/migrations/005_marker_evidence.sql`             | Add owned immutable evidence runs and linked review kind                              | 2       |
| CREATE   | `app/services/marker-evidence.mjs`                  | Catalog/owner validation, canonical snapshots and persistent runs                     | 2       |
| UPDATE   | `app/core/agent-response.mjs`                       | Validate finite tool request and evidence references                                  | 2       |
| UPDATE   | `app/core/agent-response.d.mts`                     | Tool/result document unions                                                           | 2       |
| UPDATE   | `app/core/agent-response.schema.json`               | Model-side request/reference schema                                                   | 2       |
| UPDATE   | `app/core/chat.ts`                                  | Provider-neutral tool request return type                                             | 2       |
| UPDATE   | `app/services/agent-response.mjs`                   | Resolve owned evidence references                                                     | 2       |
| UPDATE   | `infra/agent/worker.mjs`                            | Bounded two-step request/tool/result loop, audit logs and cancellation                | 2       |
| UPDATE   | `infra/agent/run-codex.mjs`                         | Ground responses in tool results and expose explicit lookup capability                | 2       |
| UPDATE   | `app/adapters/agent-openshell.mjs`                  | Workload revision and execution envelope                                              | 2       |
| UPDATE   | `infra/agent/Dockerfile`                            | Package source adapter/reference/services                                             | 2       |
| UPDATE   | `compose.yaml`                                      | Workload revision                                                                     | 2       |
| UPDATE   | `.env.example`                                      | Workload revision                                                                     | 2       |
| UPDATE   | `scripts/setup-agent.mjs`                           | Workload revision                                                                     | 2       |
| UPDATE   | `app/core/research.ts`                              | Researcher evidence-review command and canonical result snapshot                      | 3       |
| UPDATE   | `app/services/research.ts`                          | Validate review inputs and linked marker                                              | 3       |
| UPDATE   | `app/adapters/research.ts`                          | Resolve completed owned evidence and validate candidate during atomic append          | 3       |
| CREATE   | `app/(workspace)/app/evidence-card.tsx`             | Compact candidate/evidence display and explicit review/save form                      | 3       |
| UPDATE   | `app/(workspace)/app/agent-response.tsx`            | Render new finite result widget                                                       | 3       |
| UPDATE   | `app/(workspace)/app/agent-response.module.css`     | Responsive evidence/review styling                                                    | 3       |
| UPDATE   | `app/(workspace)/app/agent-chat.tsx`                | Tool progress/errors, honest scope and result context                                 | 3       |
| UPDATE   | `app/(workspace)/app/conversation-entry.tsx`        | Render linked decisions in research history                                           | 3       |
| UPDATE   | `app/(workspace)/app/conversation-composer.tsx`     | Reference context guidance without assuming a build                                   | 3       |
| UPDATE   | `app/services/health.ts`                            | Evidence source health and schema readiness                                           | 3       |
| UPDATE   | `app/adapters/chat.ts`                              | Load latest owned review receipts for displayed evidence cards                        | 3       |
| UPDATE   | `app/(workspace)/app/projects/[projectId]/page.tsx` | Open a cited evidence turn even after chat pagination                                 | 3       |
| CREATE   | `tests/marker-evidence.spec.ts`                     | Real browser, model, source, DB and review/isolation checks                           | 4       |
| UPDATE   | `scripts/verify-research-storage.mjs`               | Fresh/v4→v5 migration rehearsal and legacy preservation                               | 4       |
| UPDATE   | `README.md`                                         | Working workflow and boundaries                                                       | 4       |
| UPDATE   | `docs/architecture.md`                              | Tool loop, provenance and review ownership                                            | 4       |
| UPDATE   | `docs/verification.md`                              | Observed real acceptance and limits                                                   | 4       |
| UPDATE   | `CHANGELOG.md`                                      | Delivered wave                                                                        | 4       |
| UPDATE   | `learned.md`                                        | Source access/compatibility lessons                                                   | 4       |
| UPDATE   | `PLAN.md`                                           | This ledger and completion evidence                                                   | 1–4     |

### Ordered packages and gates

1. **Reference boundary:** verify primary-source facts and build, generate a checked factual reference, implement typed exact-match lookup. Missing context, unsupported tissues/builds/IDs and no matches are explicit outcomes; shared markers remain visible. Exit: source extraction reproducible and reference matches checked against the actual paper; no model invented evidence.
2. **Tool execution and persistence:** migrate additively; allow at most one owned marker lookup per turn, independently reauthorize before querying/persisting. Persist results with source/version/hash and immutable input. Feed real outputs to final model, require result card, reject invalid/foreign requests. Continue heartbeats/cancellation and fail loudly on adapter failure. Exit: real OpenShell request → lookup → final result persisted, migration rehearsal passes.
3. **Visual review:** render candidates with exact genes/source and limitations; explicit review/save supports candidate, unresolved and reject outcomes. Use existing submission idempotency and origin/ownership enforcement. Refresh research history; later sample changes do not rewrite results. Exit: real desktop/mobile browser user can inspect and save a linked decision.
4. **Acceptance and delivery:** real services only. Test matching, shared/competing evidence, absent IDs, missing/wrong build/tissue, malformed identifier, foreign owner/project/card/review, retry conflict, reload and old text/card compatibility. Inspect screenshots and chain logs; run lint/typecheck/build and affected browser checks. Publish branch and Amigospace checkpoint with exact observed limitations.

### Rollout and recovery

Deploy schema first, then app/worker/new schema workload together. Existing text and v1 sample/marker documents remain readable. Source validation failure disables evidence, never substitutes a fake result. Do not replay interrupted inference automatically. Preserve run audits on failed turns but prevent review until its turn completed. Roll forward if new review entries exist: older UI cannot render the new review kind. No destructive migration or volume changes.

Definition of done: an actual authenticated researcher obtains a source-backed soybean root/nodule evidence card through the real Codex/OpenShell loop and saves/reopens an owned linked review; limits and unresolved cases are observable. Classification accuracy is not established by source consistency checks.

## Earlier waves

Current wave: apply the accepted chat mockup to the working app. OpenShell chat is connected; Linux server acceptance remains separate.

Local implementation and acceptance are complete: the production Compose app is active, ten distinct real browser checks passed, and the six affected research/layout/chat checks passed again after final UI corrections. See `docs/verification.md` for evidence and limits. Publish on the sole `celloras.com` branch.

## Chat workspace redesign — 2026-10-23

User accepted `docs/mockups/celloras-chat-v1.png` as a direction, with room for refinement. Replace the long form-first page with an experiment sidebar, a viewport-sized chat with anchored composer, and a collapsible study inspector. Keep actual owned projects and research records; no invented sub-conversations, files, annotations or evidence. Existing APIs, database, runtime and submission/retry semantics stay unchanged. Scientific tools remain pending.

Current → target: authenticated layout loads owned projects → responsive sidebar; owned project page loads existing chat/research data → client workbench → chat and study inspector; inspector actions open the existing research composer/history on demand. The actual supplied logo is reused without changing its bytes. Small screens switch between chat and context, with a native navigation dialog. Drafts survive opening/closing UI panels.

### File ledger

| Action | File                                                                            | Change / why                                                                    | Package |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------- |
| CREATE | `app/(workspace)/app/workspace-icons.tsx`                                       | Shared small line icons for the workspace                                       | 1       |
| CREATE | `app/(workspace)/app/workspace-shell.tsx`                                       | Owned experiment sidebar, active navigation and mobile drawer                   | 1       |
| UPDATE | `app/(workspace)/app/layout.tsx`                                                | Load owned projects and compose the shell                                       | 1       |
| UPDATE | `app/components/brand.tsx`                                                      | Optional workspace home destination and supplied cell mark                      | 1       |
| UPDATE | `app/(workspace)/app/page.tsx`                                                  | Match experiment home to shell and new-experiment anchor                        | 1       |
| UPDATE | `app/(workspace)/app/actions.ts`                                                | Invalidate the owned sidebar after creating an experiment                       | 1       |
| UPDATE | `app/(workspace)/app/health/page.tsx`                                           | Constrain service view within new shell                                         | 1       |
| CREATE | `app/(workspace)/app/experiment-workspace.tsx`                                  | Compact project header, responsive chat/context split                           | 2       |
| CREATE | `app/(workspace)/app/research-panel.tsx`                                        | Actual context, marker/note summaries, on-demand records/editor                 | 2       |
| CREATE | `app/(workspace)/app/research-panel.module.css`                                 | Inspector and responsive research dialog styles                                 | 2       |
| UPDATE | `app/(workspace)/app/projects/[projectId]/page.tsx`                             | Wire existing services to workbench; preserve invalid cursor handling           | 2       |
| UPDATE | `app/(workspace)/app/conversation-composer.tsx`                                 | Accept initial editor mode; keep save/retry behavior                            | 2       |
| UPDATE | `app/(workspace)/app/agent-chat.tsx`                                            | Anchored composer, scroll-aware thread, compact status, real reply presentation | 2       |
| UPDATE | `app/(workspace)/app/workspace.module.css`                                      | Replace document layout with responsive workspace; retain record/form styles    | 1–2     |
| UPDATE | `tests/research-workflow.spec.ts`                                               | Exercise research actions through new panel/dialog and preserve data checks     | 3       |
| UPDATE | `tests/foundation.spec.ts`                                                      | Adapt workspace navigation where needed; preserve auth/isolation checks         | 3       |
| UPDATE | `tests/agent-chat.spec.ts`                                                      | Verify composer visibility, scrolling and unchanged real chat behavior          | 3       |
| CREATE | `tests/workspace-layout.spec.ts`                                                | Desktop/mobile navigation, panel/draft preservation and real record roundtrip   | 3       |
| UPDATE | `PLAN.md`, `README.md`, `CHANGELOG.md`, `docs/verification.md`, `learned.md`    | Scope, workflow, observed verification and lessons                              | 3       |
| CREATE | `docs/mockups/celloras-chat-v1.png`, `docs/mockups/celloras-chat-v1.prompt.txt` | Preserve accepted generated reference and exact prompts                         | 3       |

Deleted files: none. Renamed files: none. New component paths above are assigned for this wave after inspecting existing callers; no new provider/dependency is needed.

### Ordered packages and acceptance

1. Shell and brand: produce an authenticated sidebar with only the user's projects, working create/home/health/logout controls and native mobile navigation. Verify rendered desktop/mobile layout and account boundaries before shipping. No persistence contract changes.
2. Workbench: wire chat and research inspector to existing data, move editing/history into accessible dialogs, preserve drafts and submission IDs across toggles, keep cancel/retry/offline states visible. Desktop composer stays visible while messages scroll; mobile context switch does not unmount chat. Depends on shell. Verify a real saved-context/marker/note journey and actual OpenShell reply, reload and cancellation.
3. Acceptance and activation: build the Compose app, run real auth/research/chat browser checks, inspect empty/populated desktop and mobile screenshots and keyboard behavior, record observations, commit/push on `celloras.com`, update Amigospace. Runtime/DB containers stay intact. Exit when the app at localhost reflects the accepted direction, real workflows pass and evidence is saved.

Verification matrix: owned sidebar/API boundaries → two-account real browser checks; research editor/history → existing storage/retry/pagination tests through new UI; chat → real OpenShell turns/reload/cancel plus anchored composer check; responsive accessibility → 1440/390px screenshots, no horizontal overflow, keyboard dialog close/focus and retained drafts. Lint/typecheck/build complete before browser acceptance. Rollback is the app commit only; no schema or data migration is involved.

## Completed wave: persistent conversational research — 2026-10-23

User authorized implementation, parallel work, unattended verification and publishing on `celloras.com`. This section supersedes the earlier proposed form-first research slice. The target is a real persistent conversation with predefined context/marker/review elements, a configurable plant catalog (soybean enabled first), and the supplied branding. Real scientific model/reference integrations are not configured locally; this wave must not manufacture assistant answers or annotations.

Implementation and local acceptance complete. The actual Compose build, all seven browser/service tests, fresh/populated migration rehearsals, readiness transition and data-preserving restart passed. See `docs/verification.md` for evidence and the Keycloak restart caveat. The shared branch is the publication target; live scientific integrations remain a separate pending increment.

### Integration and contracts

Authenticated browser → owned experiment → research service → typed command validation → PostgreSQL append transaction → committed entry → fixed UI renderer. Existing Project IDs/routes/APIs stay compatible. Context is an immutable conversation entry; a marker submission links to its exact context and stores a snapshot. A manual review links to a marker entry in the same experiment. Messages are researcher-authored until a live agent is integrated.

`app/core/plants.ts` and `app/core/research.ts` freeze the shared contract. Service methods are `workspace(userId, projectId, before?)` and `append(userId, projectId, input: unknown)`. The workspace returns latest context, paginated entries and recent marker options plus markers displayed/referenced on the current page. Catalog methods are synchronous `list`/`find`. All clients receive serialized values, no provider credentials. Message/research commands use an explicit UUID submission ID; identical retries return the committed row, changed commands conflict and offer an explicit new-entry save. Positions remain strings because PostgreSQL uses bigint.

Configuration split: versioned catalog/tool definitions in source; secrets and environment-specific values in ignored `.env`, with variable names only in `.env.example`; canonical experiment context in PostgreSQL. Configuration validation stays centralized. Do not introduce species-specific tables or database constraints. Unknown biological metadata remains unknown.

### File change ledger

New files listed here were checked against the current tree and are assigned these paths. No deletions or renames.

| Action   | Path                                                                   | Change / reason                                                         | Package |
| -------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------- |
| CREATE   | `app/core/plants.ts`                                                   | Generic catalog/context contracts                                       | 1       |
| CREATE   | `app/core/research.ts`                                                 | Commands, entries, repository/action contracts                          | 1       |
| UPDATE   | `app/core/errors.ts`                                                   | Validation and retry conflict errors                                    | 2       |
| CREATE   | `app/plant-catalog.ts`                                                 | Reviewed species configuration, soybean only initially                  | 2       |
| CREATE   | `app/adapters/plants.ts`                                               | Validate/serve configured catalog                                       | 2       |
| CREATE   | `db/migrations/002_research_conversation.sql`                          | Additive owned entry persistence and same-project references            | 2       |
| CREATE   | `app/adapters/research.ts`                                             | Transactional append/retry, owner filtering, keyset pagination          | 2       |
| CREATE   | `app/services/research.ts`                                             | Validate commands, normalize markers, resolve context/review references | 2       |
| UPDATE   | `app/bootstrap.ts`                                                     | Construct catalog and research services                                 | 2       |
| UPDATE   | `app/services/health.ts`                                               | Probe required research schema                                          | 2       |
| UPDATE   | `app/(workspace)/app/layout.tsx`                                       | Compact authenticated shell                                             | 3       |
| UPDATE   | `app/(workspace)/app/page.tsx`                                         | Experiment create/reopen                                                | 3       |
| UPDATE   | `app/(workspace)/app/actions.ts`                                       | Authorized research server action with truthful errors                  | 3       |
| UPDATE   | `app/(workspace)/app/projects/[projectId]/page.tsx`                    | Conversation/context/history composition                                | 3       |
| CREATE   | `app/(workspace)/app/conversation-composer.tsx`                        | Notes and inline context/marker/review entry                            | 3       |
| CREATE   | `app/(workspace)/app/conversation-entry.tsx`                           | Exhaustive predefined result rendering                                  | 3       |
| CREATE   | `app/(workspace)/app/workspace.module.css`                             | Isolated responsive workspace styles                                    | 3       |
| UPDATE   | `app/components/brand.tsx`                                             | Supplied PNG, shared signature preserved                                | 4       |
| UPDATE   | `app/(public)/page.tsx`                                                | Honest chat-first landing                                               | 4       |
| UPDATE   | `app/components/annotation-card.tsx`                                   | Clearly illustrative structured preview                                 | 4       |
| UPDATE   | `app/globals.css`                                                      | Black/white kit and shared/public styles                                | 4       |
| UPDATE   | `infra/keycloak/themes/celloras/login/resources/css/celloras.css`      | Real logo without changing credentials                                  | 4       |
| CREATE   | `scripts/sync-brand-assets.mjs`                                        | Deterministic logo copy                                                 | 4       |
| GENERATE | `infra/keycloak/themes/celloras/login/resources/img/celloras-logo.png` | Exact bytes from canonical docs asset                                   | 4       |
| UPDATE   | `package.json`                                                         | Brand sync/prebuild commands                                            | 4       |
| CREATE   | `app/api/projects/[projectId]/research/route.ts`                       | Authorized read/append API sharing the domain service                   | 5       |
| UPDATE   | `app/api/responses.ts`                                                 | Safe typed research errors                                              | 5       |
| UPDATE   | `app/core/agent.ts`                                                    | Explicit biological context seam, old unavailable API compatibility     | 5       |
| UPDATE   | `app/core/tools.ts`                                                    | Context-bearing reference/model contracts                               | 5       |
| UPDATE   | `.env.example`                                                         | Configuration ownership and pending integration names                   | 5       |
| CREATE   | `docs/configuration.md`                                                | Configuration/secrets/catalog/application-data split                    | 5       |
| UPDATE   | `tests/foundation.spec.ts`                                             | Experiment UI names, preserve auth/isolation                            | 5       |
| UPDATE   | `tests/auth-screens.spec.ts`                                           | Actual logo asset availability                                          | 5       |
| CREATE   | `tests/research-workflow.spec.ts`                                      | Real durable research/API/isolation/retry/pagination journey            | 5       |
| CREATE   | `scripts/verify-research-storage.mjs`                                  | Real fresh/populated migration rehearsal in disposable databases        | 5       |
| UPDATE   | `README.md`                                                            | Current workflow/setup/limits                                           | 5       |
| UPDATE   | `docs/architecture.md`                                                 | Implemented boundaries and pending scientific integrations              | 5       |
| UPDATE   | `docs/verification.md`                                                 | Observed runtime evidence                                               | 5       |
| UPDATE   | `CHANGELOG.md`                                                         | Delivered wave                                                          | 5       |
| UPDATE   | `learned.md`                                                           | Actual findings                                                         | 5       |
| UPDATE   | `PLAN.md`                                                              | This ledger and final state                                             | 5       |

### Work packages and ownership

1. Root freezes shared contracts above. Exit: backend/UI agree their producer/consumer shapes.
2. Backend worker owns catalog, repository, service, migration, errors, wiring and readiness. Keep existing projects untouched; use an owner-locked transaction, canonical command fingerprint and immutable references. Verify with actual PostgreSQL through root integration. Exit: storage API works and missing migration fails readiness.
3. UI worker owns only workspace files. Render notes/context/markers/manual reviews in one thread; preserve drafts on errors and clear only after commit. Label researcher input and manual evidence; show actual pending scientific status. Exit: real save/reopen and mobile layout work.
4. Branding worker owns shared/public/theme assets and package scripts. Preserve canonical PNG bytes and auth field spacing. Exit: original/generated hashes match and assets render in both environments.
5. Root owns API integration, configuration docs, public contracts, tests, runtime, documentation, commits and push. Exit: real acceptance passes and remote commit is confirmed.

Workers share this checkout, do not revert others, and do not commit/push/restart services. Packages 2 and 3 follow contract freeze; branding is independent.

### Verification and rollout

| Boundary          | Required evidence                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Migration         | Fresh and populated isolated PostgreSQL rehearsal; preserve old project IDs; idempotent rerun; schema readiness fails before migration |
| Research storage  | Save context/note/markers/manual review; reload, logout/login and restart persistence; old context remains attached to old markers     |
| Retries           | Concurrent identical requests produce one row; changed content with same ID conflicts                                                  |
| Authorization     | Two accounts; foreign project reads/writes and cross-project context/review references rejected                                        |
| Pagination        | More than one page of real records; stable cursors with no missing/duplicated entries                                                  |
| Validation        | Empty/oversized markers, unsupported species, invalid cursor and malformed payloads fail; raw markers/case preserved                   |
| UI/brand          | Desktop/mobile screenshots, focus/labels, wrapping/no overflow, actual app/auth image requests                                         |
| Existing behavior | Registration without names, login/logout and legacy pending `/api/chat` still behave truthfully                                        |

Run repository lint/typecheck/build and actual Playwright tests against the Compose stack. Apply the new migration before activating the new app. Rehearse failure cases in isolated databases; never drop development data or prune volumes. Roll back application code only while retaining new entries for diagnosis/roll-forward. Secrets and browser auth traces stay out of logs and Git. Real model/source/trace acceptance remains pending until configured, with no simulated substitute.

Build on `celloras.com` only. The repository starts at one empty initialization commit.

## Outcome

A runnable Next.js foundation with a public landing page, Keycloak OIDC registration/login/logout, an owned-project workspace, PostgreSQL persistence and service health. Domain contracts isolate model, data, memory, assets and tracing. Unfinished scientific integrations fail explicitly; they do not return fabricated results. This slice does not implement annotation scoring, H-MEM, Zetaris, Nemotron inference or the NeMo service deployment.

## File change ledger

All paths below are planned CREATE actions unless marked GENERATE. No files are deleted or renamed.

| Package | Files                                                                                                                                                                                                                                                            | Purpose                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1       | `package.json`, `.nvmrc`, `.gitignore`, `.dockerignore`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `.prettierignore`                                                                                                              | Reproducible runtime and tooling                                              |
| 1       | `package-lock.json` (GENERATE: npm install)                                                                                                                                                                                                                      | Pin dependency graph                                                          |
| 1       | `app/core/types.ts`, `app/core/auth.ts`, `app/core/projects.ts`, `app/core/agent.ts`, `app/core/observability.ts`, `app/core/tools.ts`, `app/core/errors.ts`                                                                                                     | Provider-neutral boundaries and explicit unavailable state                    |
| 2       | `app/config.ts`, `app/bootstrap.ts`, `app/adapters/database.ts`, `app/adapters/auth.ts`, `app/adapters/projects.ts`, `app/adapters/memory.ts`, `app/adapters/data.ts`, `app/adapters/assets.ts`, `app/adapters/observability-nvidia.ts`, `app/gateway/vercel.ts` | Wiring, real auth/storage, explicit pending integrations                      |
| 2       | `app/services/access.ts`, `app/services/annotation.ts`, `app/services/health.ts`                                                                                                                                                                                 | Ownership, annotation orchestration boundary, real probes                     |
| 3       | `app/layout.tsx`, `app/globals.css`, `app/(public)/page.tsx`, `app/components/brand.tsx`, `app/components/annotation-card.tsx`                                                                                                                                   | Public visual foundation and labelled illustrative result                     |
| 3       | `app/(auth)/login/route.ts`, `app/(auth)/register/route.ts`, `app/api/auth/callback/route.ts`, `app/api/auth/logout/route.ts`, `app/auth-error/page.tsx`                                                                                                         | OIDC browser routes and errors                                                |
| 3       | `app/(workspace)/app/layout.tsx`, `app/(workspace)/app/page.tsx`, `app/(workspace)/app/projects/[projectId]/page.tsx`, `app/(workspace)/app/health/page.tsx`, `app/(workspace)/app/actions.ts`, `app/error.tsx`, `app/not-found.tsx`                             | Protected project UI, actions and service-health view                         |
| 3       | `app/api/responses.ts`, `app/api/projects/route.ts`, `app/api/projects/[projectId]/route.ts`, `app/api/chat/route.ts`, `app/api/health/live/route.ts`, `app/api/health/ready/route.ts`                                                                           | Authorized APIs and liveness/readiness                                        |
| 4       | `compose.yaml`, `Dockerfile`, `.env.example`, `infra/postgres/init.sql`, `infra/keycloak/realm.json`, `db/migrations/001_foundation.sql`, `scripts/migrate.mjs`, `scripts/setup.mjs`                                                                             | Local app/PostgreSQL/Keycloak stack, separate database roles, durable storage |
| 5       | `playwright.config.ts`, `tests/foundation.spec.ts`, `.github/workflows/check.yml`                                                                                                                                                                                | Browser journey and two-user isolation against real services; build CI        |
| 5       | `README.md`, `docs/architecture.md`, `docs/verification.md`, `learned.md`, `CHANGELOG.md`, `AGENTS.md`                                                                                                                                                           | Setup, boundaries, evidence and remaining work                                |

## Ordered work packages

1. Contracts and runtime: install pinned packages, define interfaces and explicit errors. Exit: dependency resolution and coherent contracts.
2. Auth and persistence: authorization code + PKCE/state/nonce with a maintained OIDC client; opaque database sessions; SQL ownership predicates. Exit: code paths contain no provider tokens in browser storage or tracing.
3. Routes/UI: landing, Keycloak redirects, owned projects, health, APIs. Exit: real browser reaches landing and protected routes reject anonymous access.
4. Compose: separate app/Keycloak roles and databases, realm import, persistent volumes, migration service. Exit: services start or precise external blockers are recorded without claiming runtime proof.
5. Acceptance/docs: build and run browser registration, login, project create/reopen, cross-user denial, logout; inspect desktop/mobile screenshots. Commit and push this structure on `celloras.com` and update Amigospace.

## Verification and activation

| Boundary                             | Evidence                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------ |
| Browser → app                        | Landing, mobile layout, navigation and real screenshots                  |
| App → Keycloak → session             | Registration/login/logout with real provider, invalid callbacks rejected |
| Account → owned project              | Two accounts; unauthorized read and annotation request denied            |
| App → PostgreSQL                     | Create/reopen durable project, restart check when Docker permits         |
| App → unfinished sponsor integration | Authenticated request receives explicit 503; service view says pending   |
| Deployment                           | Compose startup, migrations, readiness and production build              |

Local development only: Keycloak start-dev and loopback-bound ports. Production TLS/hostname, SMTP, backups, retention and sponsor credentials remain separate work. Migrations are additive. Do not delete Docker data to make room. Rollback the app commit without removing named database volumes.

## Completion

Foundation implemented and verified against the real Compose stack. See `docs/verification.md` for exact evidence and explicit integration limits. The initial shell initializer was replaced by SQL before the first implementation commit; no preexisting repository files were deleted or renamed.

## Login and registration design — 2026-10-23

Apply the [Celloras Design Kit](https://space.heyamigo.org/items/337333f2-4a2c-41c1-b09a-3bc8a58e9e79) to the actual credential forms: white/light-gray surfaces, black actions, system sans, 8px controls and restrained spacing. The logo attachment is not available as image bytes; use the product name until the exact asset arrives.

1. CREATE an inherited Keycloak login theme (properties, CSS, English messages and a home-link footer). Preserve the provider's credential handling, accessibility and validation templates.
2. UPDATE Compose and realm import to load it. CREATE a small explicit theme-activation script for existing realms; importing alone does not update them.
3. UPDATE real browser tests for desktop/mobile forms, password visibility and invalid input; rerun account registration/login/logout. Record screenshots, verification, changelog and lessons. Commit on `celloras.com` and save the result in Amigospace.

## Simplify signup — 2026-10-23

User correction: registration is too tight; first/last name do not belong in the first step. Widen the registration card and increase its internal spacing. Configure first/last name as optional administrative attributes in Keycloak, so signup contains email/password/confirmation without a follow-up name requirement. Preserve existing account data. Keep the profile configuration in realm import and apply it explicitly to the running realm through the existing configuration script. Verify real signup without names, subsequent login and mobile/desktop screenshots, then commit on `celloras.com`.

# Connected agent chat — 2026-10-23

User correction: this wave must connect NVIDIA OpenShell and produce real CLI-agent replies, not only a frontend shell. Keep the single `celloras.com` branch. First prove a real Codex run inside OpenShell, then connect durable owned conversations and the UI. Existing sample/marker/review records remain intact. Scientific retrieval integrations remain explicitly unavailable.

## Integration and file ledger

Target: browser → authenticated experiment chat API → PostgreSQL turn queue → agent worker → OpenShell sandbox → Codex CLI → persisted reply → browser. The worker owns execution; Celloras owns conversation history. Request IDs prevent duplicate turns, and only one turn per experiment runs at a time. Credentials remain outside source control and browser responses.

Portability requirement: Linux server deployment is required. Use NVIDIA's official multi-architecture Docker gateway and standard OCI workload images as the primary deployment path. Containers still require a compatible Linux kernel (Landlock ABI 3+ and required seccomp operations). The installed Docker Desktop kernel failed Landlock qualification. A separately selected native MicroVM gateway is being checked for local macOS development; application and worker contracts must not depend on macOS. Never automatically switch runtimes or silently execute the CLI on the host.

| Action | Path                                                | Purpose                                                              | Package |
| ------ | --------------------------------------------------- | -------------------------------------------------------------------- | ------- |
| CREATE | `infra/agent/Dockerfile`                            | Pinned OpenShell CLI worker image                                    | 1       |
| CREATE | `infra/agent/codex.Dockerfile`                      | Isolated Codex workload image                                        | 1       |
| CREATE | `infra/agent/codex-provider.yaml`                   | Gateway-held Codex credential handles and allowed endpoints          | 1       |
| CREATE | `infra/agent/run-codex.mjs`                         | Headless Codex entry point inside the sandbox                        | 1       |
| CREATE | `app/adapters/agent-openshell.mjs`                  | Runtime adapter shared by the worker and real runtime probe          | 1       |
| CREATE | `scripts/agent-gateway.mjs`                         | Explicit optional local MicroVM gateway launcher                     | 1       |
| CREATE | `scripts/verify-agent.mjs`                          | Real isolated agent execution probe                                  | 1       |
| CREATE | `infra/agent/worker.mjs`                            | Durable queue execution, cancellation, lifecycle, sanitized progress | 2       |
| CREATE | `scripts/setup-agent.mjs`                           | Reproducible local runtime/credential preparation                    | 1       |
| UPDATE | `compose.yaml`                                      | OpenShell gateway and worker                                         | 1       |
| CREATE | `db/migrations/003_agent_chat.sql`                  | Owned durable turns and statuses                                     | 2       |
| CREATE | `app/core/chat.ts`                                  | Provider-neutral chat/run contracts                                  | 2       |
| CREATE | `app/adapters/chat.ts`                              | PostgreSQL ownership/idempotency boundary                            | 2       |
| CREATE | `app/services/chat.ts`                              | Input validation and conversation service                            | 2       |
| CREATE | `app/api/projects/[projectId]/chat/route.ts`        | Authenticated submit/read/cancel boundary                            | 2       |
| UPDATE | `app/bootstrap.ts`                                  | Wire chat service                                                    | 2       |
| UPDATE | `app/api/responses.ts`                              | Safe chat validation/conflict/runtime responses                      | 2       |
| CREATE | `app/(workspace)/app/agent-chat.tsx`                | Live conversation, progress, retry/cancel and drafts                 | 3       |
| UPDATE | `app/(workspace)/app/projects/[projectId]/page.tsx` | Chat-first experiment with existing research tools                   | 3       |
| UPDATE | `app/(workspace)/app/workspace.module.css`          | Design-kit chat layout, responsive states                            | 3       |
| UPDATE | `app/(workspace)/app/conversation-composer.tsx`     | Distinguish research notes from agent messages                       | 3       |
| UPDATE | `app/services/health.ts`                            | Actual agent-worker/OpenShell health                                 | 2       |
| UPDATE | `.env.example`                                      | Runtime configuration                                                | 2       |
| UPDATE | `package.json`                                      | Agent setup command                                                  | 1       |
| CREATE | `tests/agent-chat.spec.ts`                          | Real live-agent conversation, persistence and isolation              | 4       |
| UPDATE | `README.md`                                         | Run instructions and current capabilities                            | 4       |
| UPDATE | `docs/architecture.md`                              | Runtime and provider boundaries                                      | 4       |
| UPDATE | `docs/configuration.md`                             | Secrets and agent configuration ownership                            | 4       |
| UPDATE | `docs/verification.md`                              | Observed integration/browser evidence                                | 4       |
| UPDATE | `learned.md`                                        | Runtime findings                                                     | 4       |
| UPDATE | `CHANGELOG.md`                                      | Delivered behavior                                                   | 4       |
| UPDATE | `PLAN.md`                                           | Plan and final evidence                                              | 4       |

Deleted files: none. Renamed files: none. The listed additions are now implemented.

1. Prove the runtime: install pinned CLI, start local OpenShell with authenticated control access, run a real Codex prompt inside its sandbox using explicitly scoped credentials. No host execution substitute. Exit: actual model reply and runtime evidence.
2. Add durable owned turns and a worker with claim/heartbeat/failure recovery, bounded context, explicit unavailable/error states, cancellation and no duplicate execution on ordinary retries. Exit: real HTTP/SQL/worker run completes and foreign accounts cannot access it.
3. Connect chat-first UI, preserving existing research forms, showing actual progress and committed replies, handling reload/disconnect and mobile layout. Exit: browser conversation and follow-up remember experiment context.
4. Verify real model turns, auth/isolation, cancellation/error behavior, reload persistence, desktop/mobile screenshots and existing workflows; run repository checks. Record exact limits and update Amigospace from confirmed results. Do not claim scientific annotation/source lookup is connected merely because general chat works.

Activation is local Compose only. Additive SQL; retain existing data and volumes. Pause worker before runtime changes; do not auto-retry an interrupted model call, because its outcome may be uncertain. Keep provider choice configurable at the runtime boundary; this first proof uses the available Codex authentication, without inventing missing Vercel/OpenRouter keys.

Acceptance: real OpenShell/Codex probe, two live-chat browser tests and seven existing browser tests passed. Forced worker termination recovered without replay; cancellation and gateway sandbox cleanup were confirmed. Desktop/mobile chat screenshots were inspected. Docker app/worker builds, lint and TypeScript checks passed. The native Linux server path is configured but not acceptance-tested on a separate server; the tested local gateway uses NVIDIA MicroVM because this Docker Desktop kernel lacks Landlock. See `docs/verification.md` for observed evidence and remaining scientific scope.

## Render agent Markdown — 2026-10-23

The assistant response currently uses a plain paragraph, so Markdown syntax appears literally. Add a reusable `app/components/markdown-message.tsx` renderer and scoped CSS, with pinned `react-markdown` and `remark-gfm` dependencies. Replace only the assistant response presentation in `agent-chat.tsx`; keep stored responses and user prompts unchanged. Support semantic headings, lists, links, quotes, code and tables; contain wide content inside the reply. Keep raw HTML disabled and the library's safe URL handling, and render image references as links rather than automatic network loads. Use per-message footnote IDs.

Verify a real OpenShell reply through the browser, persisted history after reload, mobile overflow and unsafe markup handling. Record screenshots and observed results, update README/changelog/engineering notes, and publish on the existing `celloras.com` branch.

Completed: production build activated, lint/typecheck/format checks passed, and the real registration → OpenShell reply → saved-history browser journey passed in 23.6 seconds. Inspected desktop/mobile screenshots and confirmed unsafe URL/HTML handling plus local table/code scrolling. Initial Docker disk exhaustion was resolved by clearing unused build cache; application data and runtime containers were preserved.

## Visual agent cards — 2026-10-23

Outcome: real agent replies combine Markdown with saved sample-context and marker-set cards in the same conversation. Cards use existing research components, show their source, preserve snapshots across reloads and offer an explicit follow-up action. Remain on `celloras.com`. No fabricated scientific results, arbitrary HTML/widgets, new provider, or automatic research writes.

Current path: owned queue → OpenShell/Codex → string → PostgreSQL → Markdown. Target: same path → versioned response blocks → strict validation and owned record resolution → persisted document → known React card components. Codex uses its supported `--output-schema`; the schema and response types are provider-neutral. Models request card types and entry IDs only; data is fetched from canonical owned research records. Unknown kinds, malformed output and unavailable/foreign references fail visibly. Existing null-document rows keep their Markdown presentation.

| Action | Path                                            | Purpose                                                    | Package |
| ------ | ----------------------------------------------- | ---------------------------------------------------------- | ------- |
| CREATE | `app/core/agent-response.schema.json`           | Versioned model-output schema, text plus record references | 1       |
| CREATE | `app/core/agent-response.mjs`                   | Strict bounded response parser and text projection         | 1       |
| CREATE | `app/core/agent-response.d.mts`                 | Provider-neutral request/document/block contracts          | 1       |
| UPDATE | `app/core/chat.ts`                              | Structured runtime result and persisted document           | 1       |
| CREATE | `db/migrations/004_agent_response_document.sql` | Add nullable response JSON without rewriting history       | 1       |
| CREATE | `app/services/agent-response.mjs`               | Resolve permitted references with owner/project checks     | 2       |
| UPDATE | `infra/agent/worker.mjs`                        | Available card catalog, resolution, atomic persistence     | 2       |
| UPDATE | `app/adapters/agent-openshell.mjs`              | Parse final structured output; new workload revision       | 2       |
| UPDATE | `infra/agent/run-codex.mjs`                     | Apply response schema and card instructions                | 2       |
| UPDATE | `infra/agent/codex.Dockerfile`                  | Include canonical schema in workload                       | 2       |
| UPDATE | `infra/agent/Dockerfile`                        | Include shared response contracts and resolver             | 2       |
| UPDATE | `compose.yaml`                                  | Select revised workload image                              | 2       |
| UPDATE | `scripts/setup-agent.mjs`                       | Build/select revised workload image                        | 2       |
| UPDATE | `.env.example`                                  | Document revised workload image                            | 2       |
| UPDATE | `scripts/verify-research-storage.mjs`           | Rehearse v3→v4 and preserve legacy replies                 | 1       |
| UPDATE | `scripts/verify-agent.mjs`                      | Verify structured live response                            | 2       |
| UPDATE | `app/adapters/chat.ts`                          | Return saved response document                             | 3       |
| UPDATE | `app/services/health.ts`                        | Require additive document column                           | 3       |
| UPDATE | `app/(workspace)/app/conversation-entry.tsx`    | Export reusable research content                           | 3       |
| CREATE | `app/(workspace)/app/agent-response.tsx`        | Known card rendering and follow-up actions                 | 3       |
| CREATE | `app/(workspace)/app/agent-response.module.css` | Responsive card presentation                               | 3       |
| UPDATE | `app/(workspace)/app/agent-chat.tsx`            | Render blocks, safe follow-up drafts, explicit failures    | 3       |
| UPDATE | `app/(workspace)/app/experiment-workspace.tsx`  | Pass configured plant catalog                              | 3       |
| CREATE | `tests/agent-cards.spec.ts`                     | Real chat/cards/history/action/ownership journey           | 4       |
| UPDATE | `README.md`                                     | Usage and scope                                            | 4       |
| UPDATE | `docs/architecture.md`                          | Protocol, trust and extension boundaries                   | 4       |
| UPDATE | `docs/verification.md`                          | Actual acceptance and migration evidence                   | 4       |
| UPDATE | `learned.md`                                    | Findings and operational constraints                       | 4       |
| UPDATE | `CHANGELOG.md`                                  | Delivered behavior                                         | 4       |
| UPDATE | `PLAN.md`                                       | This ledger and acceptance status                          | 1–4     |

Deleted files: none. Renamed files: none.

1. Define bounded v1 output and additive storage. Verify repository checks and migration preservation/rerun against real PostgreSQL before activation. Exit: contracts agree and existing history survives.
2. Connect the runtime and resolver. Depends on 1. Include canonical record IDs in bounded prompt context; permit only those IDs and correct types, then independently check database ownership. Persist resolved snapshots with Markdown in one terminal update; cancelled/failed turns keep neither. Exit: actual OpenShell structured probe and real-database valid/invalid/foreign reference checks pass.
3. Render predefined cards and follow-up drafts. Depends on 1–2. Reuse research content and plant configuration. Preserve existing unsent text when adding a card question; do not auto-submit. Exit: real browser shows both card types and reload, source details, expansion, mobile layout and follow-up behavior work.
4. Verify and publish. Real registration/project/context/markers → model-selected cards → owned persisted document → browser; update context and prove earlier cards stay unchanged; reject cross-owner/project references at resolver/API; verify Markdown-only and legacy history, cancellation/recovery. Inspect screenshots, lint/typecheck/build, document observed limits, push the shared branch and update Amigospace.

Activation: stop worker only after active runs finish; apply additive migration; build versioned workload and new app/worker; start and check readiness. Keep existing research and chat data. On failure stop the new worker; prior app/worker can still read `response_text` and ignore the nullable new column. Never roll back by dropping stored documents. Docker guest space is limited; inspect before builds and clear only already-authorized unused build cache if needed.

Accepted: real schema-constrained OpenShell probe; fresh/populated migration rehearsals and unchanged reruns; preserved checksums for 16 existing chat turns and 1,023 research records. Nine distinct real browser checks passed, with the final eight card/chat/research/layout checks passing in 2.9 minutes. Verified canonical card data, stale-context snapshot preservation, explicit follow-ups, legacy history, strict format and independent owner/project denial, cancellation and crash/offline recovery. Production workload/app/worker builds, lint/typecheck/format passed; inspected final desktop/mobile screenshots and saved the actual PNG in Amigospace. The local stack is running the new implementation.
