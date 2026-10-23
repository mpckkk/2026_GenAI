# Celloras

<p align="center">
  <img src="docs/assets/celloras-logo.png" alt="Celloras — plant cell logo and wordmark" width="560" />
</p>

An agent-driven workspace for plant single-cell research, starting with soybean. All work lives on [`celloras.com`](https://github.com/mpckkk/2026_GenAI/tree/celloras.com).

Sign in, open an experiment, and talk with the agent. Save plant/sample context, marker sets, notes and reviewed cell-type decisions as structured conversation entries. PostgreSQL retains the research records and chat history. Generic plant and provider interfaces allow other plants and integrations to be added with appropriate references and validation.

The implemented chat runtime uses Codex CLI inside NVIDIA OpenShell. A real model response has been verified through OpenShell v0.1.5 in a Linux MicroVM on Apple Silicon. Native Linux deployment has not yet been tested; browser acceptance is recorded separately in [verification](docs/verification.md).

Atlas retrieval, scientific annotation/scoring, H-MEM, Zetaris, Nemotron, NeMo Files and NVIDIA tracing remain pending. General assistant responses can help discuss the saved context; they are not validated cell-type annotations or evidence of a completed analysis.

## Research workflow

1. Create or reopen an experiment from the sidebar and send a message to the agent. The composer stays visible while the conversation scrolls.
2. Open **Study context → Edit context** to save tissue, sample, developmental stage and genome/identifier context. Unknown details can stay empty.
3. Use **Add markers** in the study panel to save a cluster's gene list: 1–200 distinct identifiers, with original text and case preserved. Exact duplicate tokens are removed only from the separate normalized list.
4. In **Research records → Edit research → Record review**, attach your interpretation, evidence and uncertainty notes to saved markers. A cell-type decision is optional.
5. Browse saved records and older entries in the research dialog. Each marker set retains its original context when the current sample changes. Closing the dialog preserves unfinished drafts.

On mobile, **Study context** opens a separate view and **Back to chat** returns to the conversation. The menu contains experiments, service health and logout. The workspace follows the accepted [chat mockup](docs/mockups/celloras-chat-v1.png); its illustrative annotation card is not a connected scientific feature.

The agent receives bounded owned conversation/research history and the latest sample context. Researcher-supplied evidence remains unverified. Replies currently render as text; structured research elements use predefined frontend components. Tool-driven annotation cards require the future scientific integration.

A turn shows queued/running/completed/failed/cancelled status. Repeating the same submission returns its saved result; changed content requires a new submission. Each experiment permits one active turn. Cancellation targets that turn's sandbox. A failed or interrupted execution is not automatically repeated, and another turn cannot start while sandbox cleanup is outstanding.

## Run locally

Use Node 22.22.0 (`.nvmrc`), npm, Docker Compose and an installed Codex CLI. Start the workspace first; `setup` creates an ignored `.env` and refuses to overwrite an existing one.

```sh
npm ci
npm run setup
docker compose up -d --build app
```

Open [localhost:3100](http://localhost:3100). Keycloak serves [login](http://localhost:3100/login) and [registration](http://localhost:3100/register), using email/password without first/last name fields. The local Keycloak admin is `admin`; its generated password is `KEYCLOAK_ADMIN_PASSWORD` in `.env`.

The default agent setup uses Docker. Use a dedicated operator account for a server's Codex login; it is separate from researchers' Keycloak accounts.

```sh
codex login
npm run agent:setup
npm run agent:verify
docker compose up -d --build agent-worker app
```

`agent:setup` installs the pinned OpenShell CLI, configures its gateway/provider, builds the Codex image and imports the operator's access credential. `agent:verify` performs a real model call and deletes its probe sandbox. The worker runs in a Linux Docker container and reaches the gateway over mTLS. It receives account-routing metadata and expiry, not the provider bearer or refresh token.

The Docker runtime needs Docker Engine/Desktop 28.0+, Landlock ABI 3+ enabled in the Linux kernel (introduced in Linux 6.2), and OpenShell's required seccomp facilities. A kernel version alone is insufficient; sandbox qualification must pass. See the [v0.1.5 support matrix](https://docs.nvidia.com/openshell/v0.1.5/about/support-matrix). Enable Docker Desktop host networking for this project's Docker gateway configuration. [Docker runtime requirements](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/sandboxes/runtimes#docker-driver)

On the tested Mac, Docker Desktop's kernel lacked the required Landlock support. An explicit Apple Silicon development option uses OpenShell's Linux MicroVM runtime:

```sh
brew install e2fsprogs
npm run agent:setup -- --runtime=vm
npm run agent:verify
docker compose up -d --build agent-worker app
```

Stop any existing Celloras gateway before switching runtime; both use port 17670. The Mac gateway is managed with `npm run agent:gateway:start` and `npm run agent:gateway:stop`. The application, worker and agent image stay portable; this launcher is a separate Mac development helper. Runtime failures never trigger an automatic switch or execution on the host.

When the imported access credential expires, the agent becomes unavailable. Renew `codex login`, rerun `agent:setup` with the **same runtime option**, and run `agent:verify`. Setup does not import refresh tokens or modify the host login file. Keep `.artifacts/openshell` private; its gateway database, encryption key and TLS material must be backed up together. See [configuration](docs/configuration.md).

## Development and checks

Compose persists application data in `celloras_postgres-data`. `docker compose down` preserves it; `down -v` removes local accounts and research data. Gateway state lives separately under `.artifacts/openshell/state`. After a PostgreSQL-only restart, restart Keycloak and the app to replace stale database connections.

For host app development, stop the Compose `app` service and run:

```sh
docker compose up -d postgres keycloak
npm run db:migrate
npm run dev
```

Ports are app 3100, Keycloak 8180 and PostgreSQL 5434. Changing the app URL also requires updating Keycloak's exact callback/logout URLs. For an existing realm, `npm run auth:configure` applies the current theme and signup configuration while preserving user data. `npm run brand:sync` copies the supplied logo into the auth theme; builds run it automatically.

```sh
npm run lint
npm run typecheck
npm run build
npm run verify:storage
npm run test:e2e
```

Browser tests use local Google Chrome, real Keycloak users and persisted test records. Keep the local services running; do not point the suite at production. Screenshots are ignored and authentication traces are disabled. `verify:storage` uses uniquely named temporary local databases and removes only those databases.

`/api/health/live` reports process liveness. `/api/health/ready` checks schema and Keycloak. `/app/health` separately shows worker availability and pending integrations. New chat turns require a ready worker heartbeat within 30 seconds; existing records remain accessible when it is offline. The legacy scientific `/api/chat` still authorizes ownership and returns `503 INTEGRATION_PENDING`.

See [architecture](docs/architecture.md), [configuration](docs/configuration.md), [verification](docs/verification.md), [implementation plan](PLAN.md) and the [Amigospace project](https://space.heyamigo.org/items/6223ea67-f6b0-4dfd-b8f5-0325f391d4e0).

## Deployment status

Compose is local development configuration, including Keycloak `start-dev`. A Linux server needs deployment overrides for public domains, TLS, production Keycloak, secret delivery, SMTP, backups and retention. This repository does not yet establish a production deployment. Local email verification/password recovery are disabled, and app sessions expire after one hour without centralized backchannel revocation.

Realm import creates missing realms but does not update existing ones. Apply future auth changes through explicit configuration/migrations. SQL migrations are checksummed; add a migration instead of editing an applied file.
