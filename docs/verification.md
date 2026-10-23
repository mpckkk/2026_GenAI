# Foundation verification — 2026-10-23

Status is updated from actual runs, not inferred from configuration.

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
