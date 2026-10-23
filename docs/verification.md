# Foundation verification — 2026-10-23

Status is updated from actual runs, not inferred from configuration.

## Soybean marker evidence and review — 2026-10-23

- Extracted factual associations from the actual Methods paragraphs p0230/p0235 of Cervantes-Pérez et al. (2024), DOI 10.1016/j.xplc.2024.100984: 62 associations, 45 distinct Glyma gene IDs and six cell-type labels per tissue. The importer checks the expected source layout/build/counts and records the downloaded HTML hash, exclusions and source URLs. The source's malformed `Glyma.15G2100100` and unmapped symbols are excluded, not guessed. [Scope and reproduction](soybean-reference.md).
- The Zhang atlas Table S2 download returned a browser challenge. Downloadable raw GEO cell-state counts were inspected but not relabeled as marker evidence. This implementation does not claim ingestion of the full Soybean Multi-Omic Atlas.
- Migration 005 passed in fresh and populated v4 disposable PostgreSQL databases, including unchanged reruns and preservation of existing records. On the development database, canonical checksums of all preexisting fields in 1,207 research entries and 27 chat turns were identical before and after migration. No volume or user record was replaced.
- Built and activated the app, worker and `celloras-codex:0.163.0-evidence1` workload. The live root journey registered a researcher, saved context/markers, obtained a real OpenShell tool request, retrieved the actual reference, received a second grounded model reply and saved an owned Endodermis review. Exact result/input snapshots survived a later Leaf sample change and reload. Desktop and 390px screenshots were inspected with no horizontal overflow.
- Five additional real-model browser journeys passed in 3.2 minutes: a nodule marker shared between sclereid-layer and vascular-bundle candidates; missing sample context; an incompatible genome version; unsupported Leaf tissue; and a compatible query with no reference match. Each produced the corresponding actual tool result/card and saved an explicit unresolved review. Unsupported symbols and the malformed source identifier remained visible without conversion.
- Review API checks rejected invented candidates, injected evidence, another project's run and another account's read/write attempts. Exact submission retries returned the saved entry; changed content conflicted. An independent worker-service check against real owned/foreign PostgreSQL records rejected a forged offered marker catalog, then successfully persisted a lookup for the valid owned marker. Its deliberately failed boundary-check turn is retained as test audit data.
- The strengthened root journey passed in 49.4 seconds with 49 real legacy storage turns before the lookup and 51 after it. A saved review reopened the correct evidence turn through its pagination cursor; mobile reload positioned that turn in the viewport after hydration. Legacy fixture rows were not presented as extra model executions. [Actual implemented screenshot](https://space.heyamigo.org/items/82db9bcf-4252-4208-beb5-930633eebd0d) is saved in the design kit from original PNG bytes.
- All nine affected existing browser tests passed in 3.0 minutes: saved-record cards, real chat/context/cancellation, worker crash recovery without inference replay, offline drafts, safe Markdown, research persistence/retries/pagination and responsive workspace interactions. Together with the six evidence journeys, 15 distinct browser tests passed. Final lint, TypeScript, formatting and production app build passed; readiness returned 200 and the worker reported a fresh ready heartbeat.
- Logs, migration checksums, source HTML and screenshots are local and ignored under `.artifacts/evidence-wave/`. The first root browser attempt timed out on an exact label locator that included select-option text; the accessible combobox role locator corrected the test, and the complete journey passed in 36.8 seconds.

Scope: a limited published reference queried by exact gene overlap with explicit tissue/build/namespace compatibility, followed by researcher review. These are source-consistency and workflow checks, not an independent annotation benchmark. Matrix analysis, calibrated scoring, full-atlas ingestion, cross-species transfer, file widgets, other CLI/API adapters and native Linux server acceptance remain pending.

## Agent-rendered cards — 2026-10-23

- A real schema-constrained Codex response through OpenShell passed the updated runtime probe. Built workload revision `celloras-codex:0.163.0-ui1` and the app/worker images, then activated them against the existing local gateway. Lint, TypeScript and full formatting checks passed.
- Migration 004 passed in fresh and populated disposable PostgreSQL databases, including an unchanged rerun and preservation of a legacy chat reply. On the development database, all preexisting fields in 16 chat turns and all 1,023 research records retained identical canonical JSON checksums across migration. No row or volume was replaced.
- The real card journey registered an account, saved sample/marker records, requested visual cards through OpenShell and confirmed that rendered IDs/data matched the canonical saved entries. The original Root cards stayed unchanged after saving Leaf context and reloading. Expandable source details and original marker text worked; follow-up actions preserved an existing draft, did not auto-send, and produced a real subsequent agent reply after submission.
- Resolver checks used the actual worker module against real PostgreSQL records. Independent database predicates rejected other-owner, other-project, absent and wrong-kind references even when the test supplied a forged offered catalog. Missing catalog entries, unknown block types/versions, injected card payloads, malformed IDs/JSON and excessive block counts were rejected. Another signed-in account received 404 for chat history. A real test-owned legacy text row still rendered without a document.
- Inspected desktop and 390px mobile screenshots, then compacted the sample card to key facts with expandable full metadata. The final card journey passed again in 51.4 seconds. Page width fits the viewport and the composer remains visible. [Actual implemented screenshot](https://space.heyamigo.org/items/d4e52d2b-aa89-4bea-a42a-f1797f0d8a8d) is saved in the design kit.
- The Markdown/security browser journey also passed through the new structured runtime. It retained semantic rendering and blocked unsafe URLs, raw HTML and automatic image loads. Logs and screenshots are ignored under `.artifacts/agent-cards/`, `.artifacts/agent-cards-e2e/` and `.artifacts/agent-cards-final-e2e/`.
- Final regression run: all eight card/chat/research/layout browser tests passed in 2.9 minutes. Together with the Markdown check, nine distinct browser tests passed. Forced worker interruption did not replay inference; cancellation and offline draft behavior remained correct. Final inspection found no unfinished turns, pending sandbox cleanup or response documents on failed/cancelled turns; the worker returned to ready.

Scope: agent-selected views of existing researcher-authored records. Scientific plots, reference evidence, validated annotations, file widgets and automatic research edits are not implemented. Card availability is bounded by the current research context, with the latest sample included independently. Additional CLI/API adapters and native Linux server acceptance remain pending.

## Markdown replies — 2026-10-23

- Replaced plain assistant paragraphs with a reusable `react-markdown`/`remark-gfm` component and scoped typography. Stored replies and user prompts are unchanged. Existing conversation history renders through the same component after reload.
- Production Docker build, lint, TypeScript and formatting checks passed. The rebuilt app is running at http://localhost:3100/app.
- One real browser journey passed in 23.6 seconds through Keycloak registration, owned project creation, OpenShell/Codex execution, persisted response retrieval and reload. Checked headings, bold/italic text, nested lists, quotes, tables, inline/fenced code, strikethrough, disabled task checkboxes, links and working footnote targets/labels.
- The actual model response contained the requested unsafe URL and HTML examples. The browser produced no executable link, injected HTML image or script execution, and made no image-reference requests. External links use `noopener noreferrer`; image references become explicit links.
- At 390px, both the page and conversation fit the viewport, the composer stays visible, and wide tables/code scroll within their own blocks. Desktop/mobile screenshots were inspected. Evidence: `.artifacts/markdown-e2e-retry/`; build and run logs: `.artifacts/markdown/`.
- The first browser attempt stopped at authentication while Docker's 31.3GB filesystem was full; the app also reported `ENOSPC` writing its image cache. Cleared 2.557GB of unused build cache under the existing cleanup authorization, preserving containers and volumes. The same browser check then passed; worker health remained ready with a fresh heartbeat.

## Chat workspace redesign — 2026-10-23

- Applied the user-accepted mockup to the real authenticated workspace: owned experiment sidebar, compact header, scrollable chat and anchored composer, plus study context and on-demand editing/history. The original cell logo is reused in navigation and assistant messages. No database, provider or authentication contract changed.
- Built and activated the production Compose app. Lint, TypeScript and full formatting checks passed. The app remains at http://localhost:3100/app.
- Ten distinct real browser tests passed during this wave: three auth/foundation checks, four research workflow/storage checks, two actual OpenShell chat/recovery checks and one new responsive workspace journey. After final UI corrections, all six affected research/layout/live-chat checks passed again in 53.2 seconds; the unchanged crash-recovery check had already passed in the earlier 1.9-minute chat run.
- Verified immediate sidebar refresh after experiment creation and two-account sidebar isolation. Research dialogs retain unsent drafts and submission IDs on close/reopen; Escape restores focus. Saved-record links show their exact record, older history clears focused selection, and the 101-marker regression still permits review of the oldest marker.
- Verified untouched sample fields adopt fresh saved context after a server refresh, while edited context drafts remain intact. Chat text survives research saves, closing panels and mobile context/navigation switches. Desktop and 390px mobile checks found no horizontal overflow.
- Real OpenShell replies retained saved tissue and prior conversation after reload. Cancellation, conflicts, owner denial and offline/interrupted-run behavior still passed. The composer remains visible during scrolling, polling does not move a reader away from earlier messages, and mobile reload shows the latest response after viewport hydration.
- Inspected desktop empty/populated chat, mobile chat/context/navigation and research-dialog screenshots. Evidence and logs are ignored under `.artifacts/workspace-e2e/`, `.artifacts/workspace-chat-e2e/`, `.artifacts/workspace-final-e2e/` and `.artifacts/chat-mockup/`. The accepted image and generation prompts are source-controlled under `docs/mockups/`.

The mockup's candidate annotation card and file uploads are design references only. This wave presents real chat and researcher-authored records; scientific retrieval and structured agent results still require their actual integrations. Native Linux server acceptance remains outstanding as recorded below.

## Connected OpenShell chat — 2026-10-23

- The pinned Codex 0.163.0 workload returned a real response through NVIDIA OpenShell 0.1.5. The reproducible `npm run agent:verify` command created a Linux sandbox, sent the prompt over gRPC exec, required a completed assistant response, and deleted the sandbox. There is no host-execution substitute.
- The Next.js production image and Linux agent-worker image built successfully. Migration 003 applied to the existing database without replacing research tables. Lint and TypeScript checks passed.
- Two real chat browser/service tests passed (1.8 minutes): saved sample context reached the model; a follow-up remembered the previous message after reload; exact retries returned the original turn; changed and concurrent submissions conflicted; cancellation stopped a running turn; another registered account received 404 for read/submit/cancel; cross-origin writes were rejected. The desktop and 390px mobile screenshots were inspected, with no measured horizontal overflow.
- The second test killed the real worker during a running turn, restarted it, and observed a failed `worker_interrupted` turn without automatic inference replay. After stopping the worker, existing submissions remained replayable, new submissions returned 503, and the unsent browser draft survived polling. The worker was restarted and readiness recovered.
- All seven existing registration/login, ownership, research-record, pagination and lost-response checks also passed against the rebuilt stack (16.9 seconds). Nine distinct browser tests pass across the two suites.
- Final SQL inspection found four completed chat turns, two cancelled turns and one interrupted turn; none retained a pending sandbox. OpenShell listed no remaining sandboxes. App, PostgreSQL and Keycloak were healthy; the agent worker was running and connected through mTLS.
- Stopped and restarted the managed MicroVM gateway, then obtained another real Codex response with the existing encrypted provider state. This confirmed persistence of its credential encryption key and TLS material. The launcher now waits for authenticated readiness; an immediate post-launch probe exposed and reproduced the original startup race before that fix.
- Evidence is local and ignored: `.artifacts/openshell/` contains setup/build/runtime logs; `.artifacts/chat-e2e/` contains chat desktop/mobile screenshots; `test-results/` contains the existing workflow screenshots. No credentials, raw login files or browser traces are committed.

Portability limit: the worker and workload run in Linux containers/guests, and the default deployment configuration uses NVIDIA's official Docker gateway. A separate native Linux server was not available for acceptance. This Mac's Docker Desktop kernel failed the actual Landlock ABI probe despite reporting Linux 6.10.14; the explicit NVIDIA MicroVM option supplied the compatible Linux guest. Production TLS/hostnames, Keycloak production mode and server operations remain deployment work.

Only the Codex CLI execution adapter is connected in this wave. Vercel/OpenRouter/direct API adapters and other CLI runners remain future integrations. Chat can discuss saved research context; atlas retrieval, validated cell annotations, analysis/scoring and scientific evidence remain unconnected.

## Conversational research and configuration — 2026-10-23

- The production Compose image builds successfully. Repository lint, TypeScript and formatting checks pass.
- All seven real browser/service tests passed against Next.js, PostgreSQL and Keycloak after the service restart (13.0 seconds): registration/login/logout, owned experiments, persistent notes/context/markers/manual reviews, validation, escaped researcher text, cross-account and cross-project denial, pagination and retry recovery.
- The retry test executes the real server action, drops its response after commit, then verifies that an edited draft gets a conflict and an explicit new-entry save preserves both records. Concurrent identical API submissions return one committed entry. Context changes do not alter older marker snapshots.
- An additional history regression created 101 marker sets, opened the oldest page and saved a manual review against the oldest marker. Referenced markers remain available even outside the recent-marker window.
- Fresh and populated disposable PostgreSQL databases passed migration and unchanged-rerun rehearsals. The development migration preserved all five pre-wave project IDs. A temporary real app container returned readiness 503 with only migration 001 and 200 after migration 002; only that temporary container/database were removed.
- PostgreSQL and app restart preserved full-row checksums for 27 application users, 22 experiments and 339 research entries. Keycloak retained a stale connection after the database restart; restarting Keycloak restored service. Local maintenance must restart that dependent service and check a real auth flow.
- The original and generated Keycloak logo bytes match SHA-256 `087659986c7f5b87c982ebe7a0942c741d0cdba728510575e98db79c7052e974`. Actual Next.js and Keycloak image requests succeed. Desktop/mobile screenshots cover the landing, spacious three-field signup, login and research conversation; no horizontal overflow was measured.
- Versioned plant configuration enables soybean (`glycine-max`) through a validated catalog adapter. Research context and marker lists are stored in PostgreSQL; local deployment values remain in ignored `.env`. No provider credentials or browser traces are committed.

This is persistent conversational research storage with predefined input and record components. Scientific assistant replies, reference retrieval, annotation scoring and sponsor service integrations remain pending. No real scientific result is claimed by these checks.

## README logo — 2026-10-23

Copied the supplied 1712×1152 PNG unchanged into `docs/assets/celloras-logo.png`; source and repository SHA-256 hashes match. Rendered the README with GitHub's Markdown API, opened the result locally in Chrome, confirmed the image loaded at 560px width and inspected the screenshot. Formatting checks passed. The original image bytes were also uploaded to Amigospace under Celloras Branding.

## Simplified signup — 2026-10-23

- Registration now contains only email, password and confirmation. First/last name inputs are absent from the rendered form; Keycloak no longer requires them from end users.
- All three browser tests passed (7.4 seconds), including two real registrations without names, logout and subsequent login without a profile-completion prompt. Inspected updated desktop/mobile registration screenshots; the desktop card is 560px wide with larger padding and field spacing.
- Applied and confirmed the profile configuration on the existing local realm. Imported the same configuration into a temporary real realm and confirmed both name attributes were optional and restricted to administration; removed only that temporary realm afterward.
- Lint passed. The app, Keycloak and PostgreSQL remain healthy. Existing accounts and projects were preserved.

## Login and registration theme — 2026-10-23

- Applied the Celloras black-and-white design kit to an inherited `keycloak.v2` theme; activated it in the existing local realm and confirmed the saved theme via the admin API.
- Lint passed. All three real browser tests passed against the running Compose stack (9.1 seconds): branded forms/validation, public access, and two-account registration/login/logout/project isolation.
- Inspected desktop (1440×1000) and mobile (390×844) screenshots for login, registration and validation states. Corrected inherited desktop padding, nested-footer spacing and the mobile container display before the final run. Password show/hide controls and account navigation work; registration has no horizontal overflow.
- App, Keycloak and PostgreSQL remain healthy. Theme files are mounted directly; no app image rebuild was needed for these changes.
- The exact logo image was not available in the received attachment. Screens currently use the text wordmark. The earlier landing/workspace styling is outside this focused auth-screen change.

## Passed

- Production Next.js build succeeded.
- Lint passed after correcting internal page links and unused pending-adapter arguments.
- PostgreSQL 17.11 and Keycloak 26.7.5 started and passed their health checks.
- Initial application migration applied successfully.
- The real Keycloak browser journey passed: two registrations, project creation and reload, second-account API/page denial, own-project 503 for unfinished annotation, cross-origin write denial, provider logout, subsequent login and project reopening.
- The public/mobile check passed at 390px after correcting the measured decorative overflow. Desktop, mobile and workspace screenshots were inspected.
- Full app Compose build succeeded; the app, PostgreSQL and Keycloak are healthy, and the migration job exited 0.
- Both browser tests passed against the actual Compose app (6.9 seconds), including container-network OIDC, anonymous API rejection, malformed callback rejection and an external return URL that was constrained to the app.
- Project count and ordered-ID checksum remained identical across PostgreSQL, Keycloak and app restarts (2 projects; checksum `b6ce4c2405a90329b5efdd678f476244`).
- `npm audit --omit=dev` reported zero vulnerabilities.

## Scope still pending

Annotation/scoring, evaluation cases, actual marker sources, Nemotron calls, Zetaris queries, H-MEM implementation, NVIDIA file bytes and Intake/Studio trace acceptance are not implemented. The adapter boundaries fail explicitly and health labels them pending.

SMTP, email verification/recovery, deployed TLS and hostnames, backup/retention policies, central revocation/backchannel logout, session refresh and production operation remain outside this local foundation.

The dependency audit reports five high-severity development-tool findings through `eslint-config-next` → `fast-glob` → `micromatch` → `braces` (GHSA-vfj7-8cjw-p6xm). The audit offers an incompatible Next.js lint-config downgrade; no forced downgrade or peer bypass was applied. The advisory concerns lint-time glob parsing; production dependencies have zero reported findings.

One-hour session expiry is implemented, but the suite does not wait an hour to test expiry. SMTP flows and provider-side administrative session revocation are not covered. Screenshots and test output are local ignored artifacts, not uploaded account data. CI configuration is included; a remote CI pass is not claimed until its run finishes.
