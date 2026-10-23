# Initial Celloras structure

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
