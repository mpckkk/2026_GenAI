# Configuration ownership

Celloras separates reviewed application definitions, operator configuration, credentials and research data.

| Setting                                    | Source of truth                                        | Consumer                                          |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------- |
| Enabled plants and suggested tissues       | Versioned `app/plant-catalog.ts`                       | Validated `ConfiguredPlantCatalog`                |
| URLs, database and Keycloak settings       | Ignored `.env`, explicitly mapped by Compose           | Server-side application adapters                  |
| Sample context, markers and reviewed calls | PostgreSQL research entries                            | Owned research service and agent context snapshot |
| Chat prompts, replies and execution state  | PostgreSQL `agent_turns` / `agent_workers`             | Chat service and worker                           |
| Gateway/provider behavior                  | `infra/agent`, generated private gateway configuration | OpenShell execution adapter                       |
| Provider bearer credential                 | Private OpenShell gateway credential storage           | Gateway/supervisor provider mediation             |
| Operator account routing ID and expiry     | Private `agent-metadata.json`                          | Worker and sandbox bootstrap                      |
| Production secrets                         | Operator-managed secret store                          | Only the service that requires them               |

The initial plant ID is `glycine-max`. Species are stored as data, not SQL enums. Tissue suggestions are not a biological ontology. Genome versions and identifier namespaces are declared sample context; future reference adapters must validate compatibility. Adding a plant requires reviewed references/mappings and evaluation alongside the catalog entry.

## Foundation settings

`npm run setup` creates local `.env` once. `.env.example` lists names and placeholders; do not overwrite an existing environment or print its secrets. `APP_ENV=local` permits the local HTTP setup. Public URLs, Keycloak callback/logout URLs and issuer configuration must agree.

Research payloads, prompts, logs, screenshots and Git must never contain credentials. `.env`, `.artifacts` and authentication traces are excluded from version control; `.artifacts` is also excluded from Docker build context. The browser receives only catalog metadata and authorized application records.

## Agent setup

`npm run agent:setup` defaults to the Docker runtime. It installs OpenShell 0.1.5 with release checksum verification, configures the gateway and `celloras-codex` provider, builds `celloras-codex:0.163.0-science1`, and writes local paths/profiles to `.env`. It reads the current Codex login from `~/.codex/auth.json`, or from an explicit `CELLORAS_CODEX_AUTH_FILE`.

Use a dedicated operator account for a shared server. Researchers' Keycloak accounts are separate; server chat consumes the configured operator's model access. Setup passes the access token/account ID to the provider-import child process environment, without placing those values in command arguments or logs. It does not import the refresh token or modify the host login file.

| Variable                                      | Meaning                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `OPENSHELL_STATE_DIR`                         | Persistent private gateway state, generated under `.artifacts/openshell/state`           |
| `OPENSHELL_CONFIG_DIR`                        | Worker mTLS/endpoint configuration, generated under `.artifacts/openshell/worker-config` |
| `CELLORAS_AGENT_METADATA_FILE`                | File containing account ID and access-token expiry, mounted read-only in the worker      |
| `COMPOSE_PROFILES`                            | Generated as `agent,agent-docker` for Docker or `agent` for the Mac MicroVM option       |
| `CELLORAS_WORKER_UID` / `CELLORAS_WORKER_GID` | Host ownership used for generated files and the worker container                         |
| `CELLORAS_AGENT_IMAGE`                        | Compatible agent image; defaults to `celloras-codex:0.163.0-science1`                    |
| `CELLORAS_AGENT_PROVIDER`                     | Configured OpenShell provider name; defaults to `celloras-codex`                         |
| `CELLORAS_AGENT_MODEL`                        | Optional Codex model choice; empty uses the authenticated account's default              |
| `CELLORAS_CODEX_AUTH_FILE`                    | Optional setup-time source for the operator's existing Codex login                       |

Image/provider/model settings are operator-only. Changing a name does not implement another CLI or API protocol. The current execution adapter is Codex-specific; additional CLI, direct API, OpenRouter or Vercel implementations require their own verified adapters.

`npm run agent:verify` performs a real model request inside an OpenShell sandbox and deletes that sandbox. A ready heartbeat means the worker can reach its gateway and its imported credential has not reached the expiry threshold; the live probe additionally exercises creation, model execution and cleanup.

## Runtime selection and renewal

The portable default is Docker. The host needs Docker Engine/Desktop 28.0+ and a Linux kernel with enabled Landlock ABI 3+ plus the required seccomp facilities. OpenShell actively qualifies the sandbox; a kernel release number alone does not prove support. [Official support matrix](https://docs.nvidia.com/openshell/v0.1.5/about/support-matrix)

The generated Docker configuration uses host networking for supervisors, so Docker Desktop host networking must be enabled. [Docker runtime setup](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/sandboxes/runtimes#docker-driver)

The tested Mac's Docker Desktop kernel lacked Landlock support. Apple Silicon development can explicitly select `npm run agent:setup -- --runtime=vm` after `brew install e2fsprogs`. The helper starts a managed Mac gateway that runs Linux MicroVMs. Use `agent:gateway:start` / `agent:gateway:stop` to manage it; these commands are not part of the Linux application. Stop the existing Celloras gateway before selecting another runtime on the same port. There is no automatic runtime fallback.

A real Codex response was verified in that MicroVM path. The worker remains a Linux Docker container with mTLS gateway access. Native Linux deployment has not yet been exercised; refer to [verification](verification.md) for the current acceptance evidence.

Access-token expiry makes the worker unavailable. Renew the operator's `codex login`, then rerun `agent:setup` with the same `--runtime=docker` or `--runtime=vm` selection and run `agent:verify`. Refresh tokens are never synchronized into the gateway. The worker metadata contains the actual account ID because current Codex workspace discovery requires it; it contains no bearer or refresh token.

## Durable state and deployment

PostgreSQL holds application data in the Compose named volume. OpenShell uses a separate private SQLite database, encryption key material and TLS state under `OPENSHELL_STATE_DIR`; both `XDG_STATE_HOME` and `XDG_DATA_HOME` point there for the gateway. Back up the gateway database **together with its encryption key and TLS state**. A database-only copy is not a complete credential-store backup. Keep the entire directory private and out of source control and shared artifacts.

The queue survives application/worker restarts. Workers claim separate experiments through database locks; each experiment has at most one active turn. Execution failure is explicit, without a substitute provider or automatic model retry. Terminal turns awaiting sandbox cleanup block new execution in that experiment.

Compose remains local configuration, including Keycloak `start-dev`. Production Linux needs deployment overrides for domains/TLS, production Keycloak, credentials, SMTP, backups, retention and operational limits. Gateway Docker-socket access is infrastructure administration and belongs in that deployment boundary, not the web app. No production-ready or native-Linux acceptance claim is made here.

## Scientific integrations

General chat, the limited published marker reference, verified local sparse root analysis and curated lexical literature retrieval are implemented. `CELLORAS_DATASET_DIR` is an operator-selected host directory, mounted read-only at `/datasets` in both app and worker. Its checksummed catalog fixes immutable dataset versions attached to projects. The literature corpus is versioned in `data/literature`; it does not silently call a vector or sponsor service. Validated annotation/scoring, Nemotron/Vercel routing, Zetaris, H-MEM, NVIDIA file storage and trace export remain pending. Their adapters must define and validate actual provider settings when implemented; placeholder credentials do not connect them. The authenticated health page separates the working foundation/worker from pending integrations, and the scientific `/api/chat` endpoint continues to return an explicit unavailable result.
