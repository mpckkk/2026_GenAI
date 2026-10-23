# Foundation verification — 2026-10-23

Status is updated from actual runs, not inferred from configuration.

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
