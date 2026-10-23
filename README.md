# Celloras

<p align="center">
  <img src="docs/assets/celloras-logo.png" alt="Celloras — plant cell logo and wordmark" width="560" />
</p>

A conversational plant single-cell research workspace for the Open Agent Hackathon 2026, starting with soybean.

All work lives on [`celloras.com`](https://github.com/mpckkk/2026_GenAI/tree/celloras.com). Sign in, open an experiment, and save notes, plant/sample context, marker sets and your annotation reviews in its conversation. Entries persist in PostgreSQL. The shared plant catalog and provider interfaces support extension to other plants as suitable references are added and validated.

Scientific agent replies, reference retrieval, H-MEM, Zetaris, Nemotron, NeMo Files and NVIDIA tracing remain pending. The conversation currently records researcher input and real storage receipts; it does not manufacture assistant answers or biological results.

## Research workflow

1. Create or reopen an experiment.
2. Add a note, or choose **Plant & sample** to record tissue, sample, developmental stage and genome/identifier context. Unknown details can stay empty.
3. Choose **Add markers** to save a cluster's gene list. Original text and case are preserved; a separate list removes exact duplicates. Each set accepts 1–200 distinct identifiers.
4. Choose **Record review** to attach your cell-type interpretation, evidence and uncertainty notes to saved markers. A cell-type decision is optional.
5. Return later or browse older conversation entries. Marker sets retain their original context even after you update the current sample.

User-authored supporting evidence is labelled as unverified. Tokenizing identifiers is not gene mapping or scientific validation. Annotation and reference access must be implemented before this becomes a working scientific agent.

## Run locally

Use Node 22.22.0 (see `.nvmrc`), npm and Docker Compose.

```sh
npm ci
npm run setup
docker compose up --build -d
```

Open http://localhost:3100 and choose **Get started**. Keycloak serves registration at http://localhost:8180. The generated `.env` contains local secrets and is ignored by Git; `npm run setup` refuses to overwrite it. The local admin username is `admin`; its generated password is `KEYCLOAK_ADMIN_PASSWORD` in that file.

Direct screens: [Log in](http://localhost:3100/login) and [Create account](http://localhost:3100/register). Both use the Celloras black-and-white theme, following the [design kit](https://space.heyamigo.org/items/337333f2-4a2c-41c1-b09a-3bc8a58e9e79). Keycloak still handles credentials and validation. The supplied [original logo](docs/assets/celloras-logo.png) is used in the app and auth theme. `npm run brand:sync` copies its exact bytes to the theme; app builds run this step automatically.

Registration asks only for email, password and password confirmation. First/last name are optional administrative attributes and are not part of signup.

For an existing local realm, apply the current theme and signup configuration after starting Keycloak:

```sh
docker compose up -d --wait keycloak
npm run auth:configure
```

The command applies the theme and name-field permissions, confirms the saved settings, and preserves existing user data and other profile attributes. New realms receive these settings from the import. Theme files are mounted from `infra/keycloak/themes/celloras`; local theme caching is disabled, so CSS changes need no app rebuild.

Compose runs the app, one migration job, PostgreSQL and Keycloak. Separate database roles own `celloras` and `keycloak`. Data persists in the `celloras_postgres-data` named volume. `docker compose down` stops services without deleting it; do not add `-v` unless intentionally resetting all local accounts and projects.

After deliberately restarting PostgreSQL, restart Keycloak and the app too (`docker compose restart keycloak app`), then wait for health and check login. Keycloak can retain stale database connections after a database-only restart.

For app development on the host:

```sh
docker compose up -d postgres keycloak
npm run db:migrate
npm run dev
```

Stop the Compose `app` service first if it is using port 3100. Local endpoints are fixed at app 3100, Keycloak 8180, PostgreSQL 5434. Changing the app port also requires updating the realm's exact callback/logout URLs.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
npm run verify:storage
npm run test:e2e
```

Browser tests use the installed Google Chrome locally, real Keycloak accounts with unique `example.test` email addresses, and real project records. Keep PostgreSQL/Keycloak running and build the app first. Tests start the production app if necessary. They create test users/projects and keep them for inspection; no production environment should be pointed at this test suite. Screenshots stay in ignored `test-results/`; authentication traces are disabled.

`verify:storage` rehearses migrations in two uniquely named local PostgreSQL databases, including an existing foundation project, verifies an unchanged second run, and removes only those temporary databases. It uses the local administrator setting and never resets the application database.

`/api/health/live` reports process liveness. `/api/health/ready` checks the workspace foundation (schema + Keycloak), not annotation readiness. The authenticated `/app/health` page lists every integration and its actual state. `/api/chat` authorizes project ownership then returns `503 INTEGRATION_PENDING` while the scientific pipeline is unfinished.

## Structure

```text
app/
  (public)/          landing page
  (auth)/            login and registration redirects
  (workspace)/app/   protected project pages and health view
  api/               account, project, chat and health boundaries
  core/              provider-neutral types and contracts
  adapters/          Keycloak, PostgreSQL and pending sponsor integrations
  gateway/           model-call boundary
  services/          ownership, annotation and health logic
  plant-catalog.ts   reviewed enabled plants and tissue suggestions
  components/        shared visual components
  bootstrap.ts       dependency wiring
db/migrations/       checksummed, transactional schema changes
infra/               local Keycloak realm and database initialization
scripts/             secret generation and migration runner
tests/               real browser journeys
```

See [architecture](docs/architecture.md), [configuration ownership](docs/configuration.md), [verification](docs/verification.md), [implementation plan](PLAN.md) and the [Amigospace project](https://space.heyamigo.org/items/6223ea67-f6b0-4dfd-b8f5-0325f391d4e0).

## Before deployment

This Compose configuration is for local development. Configure TLS, public hostnames, SMTP, backups and secret delivery before deploying. Email verification and password recovery are disabled in the local realm until SMTP is available. App sessions expire after one hour; centralized session revocation/backchannel logout and refresh are not implemented yet.

Realm import only creates a missing realm; it does not update an existing one. Apply future client/SMTP changes through Keycloak administration or an explicit migration. App SQL migrations fail if an already-applied file changes; add a new migration instead.
