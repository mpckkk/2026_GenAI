# Foundation verification — 2026-10-23

Status is updated from actual runs, not inferred from configuration.

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
