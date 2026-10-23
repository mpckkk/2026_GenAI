# Celloras implementation record

Current wave: connected OpenShell agent chat, documented in the final section below. Linux deployment portability is required; local Mac runtime setup is separate from application and worker contracts.

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
