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

`npm run agent:setup` defaults to the Docker runtime. It installs OpenShell 0.1.5 with release checksum verification, configures the gateway and `celloras-codex` provider, builds `celloras-codex:0.163.0-annotation1`, and writes local paths/profiles to `.env`. It reads the current Codex login from `~/.codex/auth.json`, or from an explicit `CELLORAS_CODEX_AUTH_FILE`.

Use a dedicated operator account for a shared server. Researchers' Keycloak accounts are separate; server chat consumes the configured operator's model access. Setup passes the access token/account ID to the provider-import child process environment, without placing those values in command arguments or logs. It does not import the refresh token or modify the host login file.

| Variable                                      | Meaning                                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `OPENSHELL_STATE_DIR`                         | Persistent private gateway state, generated under `.artifacts/openshell/state`           |
| `OPENSHELL_CONFIG_DIR`                        | Worker mTLS/endpoint configuration, generated under `.artifacts/openshell/worker-config` |
| `CELLORAS_AGENT_METADATA_FILE`                | File containing account ID and access-token expiry, mounted read-only in the worker      |
| `COMPOSE_PROFILES`                            | Generated as `agent,agent-docker` for Docker or `agent` for the Mac MicroVM option       |
| `CELLORAS_WORKER_UID` / `CELLORAS_WORKER_GID` | Host ownership used for generated files and the worker container                         |
| `CELLORAS_AGENT_IMAGE`                        | Compatible agent image; defaults to `celloras-codex:0.163.0-annotation1`                 |
| `CELLORAS_AGENT_PROVIDER`                     | Configured OpenShell provider name; defaults to `celloras-codex`                         |
| `CELLORAS_AGENT_MODEL`                        | Optional Codex model choice; empty uses the authenticated account's default              |
| `CELLORAS_CODEX_AUTH_FILE`                    | Optional setup-time source for the operator's existing Codex login                       |

Image/provider/model settings are operator-only. The default OpenShell execution adapter is Codex-specific. A separate Meterless Nightshift API adapter implements the same bounded tool/card protocol; it requires its actual runtime and token. Additional CLI, direct API, OpenRouter or Vercel implementations require their own verified adapters.

`npm run agent:verify` performs a real model request inside an OpenShell sandbox and deletes that sandbox. A ready heartbeat means the worker can reach its gateway and its imported credential has not reached the expiry threshold; the live probe additionally exercises creation, model execution and cleanup.

## Runtime selection and renewal

The portable default is Docker. The host needs Docker Engine/Desktop 28.0+ and a Linux kernel with enabled Landlock ABI 3+ plus the required seccomp facilities. OpenShell actively qualifies the sandbox; a kernel release number alone does not prove support. [Official support matrix](https://docs.nvidia.com/openshell/v0.1.5/about/support-matrix)

The generated Docker configuration uses host networking for supervisors, so Docker Desktop host networking must be enabled. [Docker runtime setup](https://docs.nvidia.com/openshell/v0.1.5/how-it-works/sandboxes/runtimes#docker-driver)

The tested Mac's Docker Desktop kernel lacked Landlock support. Apple Silicon development can explicitly select `npm run agent:setup -- --runtime=vm` after `brew install e2fsprogs`. The helper starts a managed Mac gateway that runs Linux MicroVMs. Use `agent:gateway:start` / `agent:gateway:stop` to manage it; these commands are not part of the Linux application. Stop the existing Celloras gateway before selecting another runtime on the same port. There is no automatic runtime fallback.

A real Codex response was verified in that MicroVM path. The worker remains a Linux Docker container with mTLS gateway access. The native Ubuntu 24.04 production server also passed a real Codex sandbox probe with Docker 28.5.0 and kernel 6.8.0-147; refer to [verification](verification.md) for acceptance evidence.

When upgrading a workload revision, let active turns finish and stop the worker before setup. The MicroVM gateway has a separate bootstrap image: requesting a new sandbox image does not change an already-running gateway's bootstrap configuration. Setup writes the matching image explicitly and restarts/recreates the gateway when its TOML changes, preserving its database, keys and TLS files. Run `npm run agent:verify` before starting the updated worker. A failed probe is an execution failure, not a reason to switch runtime or replay prior turns automatically.

Access-token expiry makes the worker unavailable. Renew the operator's `codex login`, then rerun `agent:setup` with the same `--runtime=docker` or `--runtime=vm` selection and run `agent:verify`. Refresh tokens are never synchronized into the gateway. The worker metadata contains the actual account ID because current Codex workspace discovery requires it; it contains no bearer or refresh token.

## Durable state and deployment

PostgreSQL holds application data in the Compose named volume. OpenShell uses a separate private SQLite database, encryption key material and TLS state under `OPENSHELL_STATE_DIR`; both `XDG_STATE_HOME` and `XDG_DATA_HOME` point there for the gateway. Back up the gateway database **together with its encryption key and TLS state**. A database-only copy is not a complete credential-store backup. Keep the entire directory private and out of source control and shared artifacts.

The queue survives application/worker restarts. Workers claim separate experiments through database locks; each experiment has at most one active turn. Execution failure is explicit, without a substitute provider or automatic model retry. Terminal turns awaiting sandbox cleanup block new execution in that experiment.

Base Compose remains local configuration, including Keycloak `start-dev`. The public `celloras.com` deployment uses `compose.prod.yaml` with production Keycloak at `auth.celloras.com`, HTTPS origins and reverse-proxy routing. The imported scientific dataset and matching OpenShell workload are configured on the deployment host. SMTP, backups, retention and operational limits still require separate acceptance. Gateway Docker-socket access is infrastructure administration and belongs in that deployment boundary, not the web app. Public page availability does not establish native Linux agent acceptance.

Production setup accepts an explicit durable home and Compose project, without modifying the deployment manager’s environment:

```sh
npm run agent:setup -- --runtime=docker --home=/var/lib/celloras/openshell --settings-file=/var/lib/celloras/openshell/runtime.env --compose-file=compose.yaml --compose-file=compose.prod.yaml --compose-project=celloras-p51fpi
npm run agent:verify -- --home=/var/lib/celloras/openshell
```

Merge the generated nonsecret runtime settings into the deployment manager’s persisted environment, preserving unrelated settings. Set `CELLORAS_DATASET_DIR=/var/lib/celloras/scientific-data` only after publishing and verifying the dataset catalog, manifest and every file checksum there. Then build/start the app and worker using the same Compose files and project. `CELLORAS_AGENT_HOME` is also accepted by setup and verification. Without `--settings-file`, setup retains the local behavior of updating `.env`; custom homes are supported for Docker, while the Mac MicroVM retains its managed local home.

The production gateway publishes only on host loopback; the worker connects with mTLS. Keep the private agent home, metadata and settings file outside source control. Renewal uses the same durable home, runtime and Compose options, followed by the real probe before worker activation. Renew the current production access credential before **2026-10-30 13:46 UTC**; the server does not hold a refresh credential.

## Scientific integrations

General chat, the limited published marker reference, verified local sparse root analysis, provisional marker-based annotation and curated lexical literature retrieval are implemented. `CELLORAS_DATASET_DIR` is an operator-selected host directory, mounted read-only at `/datasets` in both app and worker. Its checksummed catalog fixes immutable dataset versions attached to projects. Annotation uses `data/references/soybean-annotation-v1.json` with exact species, tissue and genome compatibility. The separate source-label benchmark is never imported by runtime ranking. Reference provenance and thresholds are documented in [annotation methods](annotation-method.md).

The literature corpus is versioned in `data/literature`; it does not silently call a vector service. H-MEM recalls explicit saved reviews through the worker. Zetaris and Nightshift adapters require the setup below; their presence in code is not a live connection. Independently validated annotation, verified Nemotron execution, Vercel routing, NVIDIA file storage and trace export remain pending. The authenticated health page separates working services from missing access. The scientific `/api/chat` endpoint queues owned dataset annotation through the same chat service and rejects unsupported gene-only input.

## Sponsor integrations

H-MEM is bundled from [Meterless's Apache-2.0 reference](https://github.com/Meterless/Meterless/tree/1742dec56a66e58eef9dda2d2b865823758ca8cd/engines/hmem). Migration 009 stores a project-owned engine snapshot and append-only trust ledger in PostgreSQL. On turn claim it ingests current explicit annotation and marker-review decisions, then recalls at most five using the upstream deterministic hashed embeddings and hybrid ranker. An explicit marker-set name or group/cluster ID selects its current owned reviews before ranking (threshold 0); other queries use threshold 0.2. The retrieval trace records that selection. No hosted key, GPU, automatic model mining, dreaming or biological confidence score is involved. Replaced decisions remain in the ledger and earlier answers retain their original receipts. The current per-project limit is 2,000 active targets and 10,000 historical memories; exceeding it fails explicitly. It is not an unbounded memory service.

Zetaris supplies the verified Wm82v4 root marker panel. Keep `CELLORAS_REFERENCE_PROVIDER=published` until a real probe succeeds:

1. Run `node scripts/prepare-zetaris-reference.mjs`. This exports the existing 42 source associations to `.artifacts/sponsors/zetaris-marker-reference.csv` and `.artifacts/sponsors/zetaris-marker-reference.json` for administrator ingestion. The JSON export is a single array, matching the verified self-hosted reader; NDJSON was observed to return only its first record. It does not change researcher uploads or implement `.h5ad` ingestion.
2. Import/register that table in your Zetaris workspace. Preserve `record_index` as an integer and `record_json`, `reference_id`, `content_sha256` as exact strings. Each `record_json` is one original source record; every row carries the pinned document hash. Do not normalize or regenerate gene IDs.
3. Store `ZETARIS_API_URL` (workspace API origin, without `/api/v1.0`; HTTPS by default), `ZETARIS_API_TOKEN`, numeric `ZETARIS_ORG_ID` and dotted SQL `ZETARIS_REFERENCE_TABLE` in private deployment configuration. Never put them in the repository or browser.
4. Run `node --env-file=.env scripts/verify-sponsors.mjs zetaris` from the configured environment. It makes a real SQL query, verifies all records and their content hash, then closes the query. A missing, truncated or altered reference fails. Only after success select `CELLORAS_REFERENCE_PROVIDER=zetaris` and recreate app/worker. Zetaris mode supports this Wm82v4 root panel only; incompatible legacy builds are not silently served from another provider.

The adapter follows the [official SaaS OpenAPI](https://api.saas.enterprise.zetaris.com/redoc/index.html): Bearer API token, `X-Org-ID`, fresh `X-Request-ID`, POST `/api/v1.0/query/sql/start` and DELETE `/api/v1.0/query/sql/close/{queryToken}`. The known panel fits one bounded page of 100 rows; any other row count/page count fails. Table/SQL inputs are operator-owned. Query receipts contain request IDs and source hashes, never query tokens or credentials. The official self-hosted 2.4.3.1 hackathon bundle passed all nine installation checks on 2026-10-25. The real adapter retrieved and hash-verified all 42 associations using a dedicated GENERAL account with SELECT on `CELLORAS.marker_reference_v1`; its API key expires on 2026-11-25. Renew it before that date.

For private Docker installations, explicitly set `ZETARIS_ALLOW_PRIVATE_HTTP=true`. HTTP is accepted only for loopback/private IPv4, `::1`, `host.docker.internal` or a single-label Docker host; public HTTPS remains the default. On the installed Linux stack, the origin is `http://celloras-zetaris-api:8888`. Administrative ports bind to loopback; reach the UI with an SSH tunnel to host port 13300. The stack lives outside the checkout at `/var/lib/celloras/sponsors/zetaris/zetaris-platform`, with a separate Compose project and persistent volumes. Keep the vendor bundle, registry credentials, bootstrap passwords and API key outside Git.

Mount the JSON export into the driver's persistent `customer-data` volume before registering it. The verified registration and table-specific grant are:

```sql
CREATE LIGHTNING DATABASE CELLORAS DESCRIBE BY "Celloras versioned soybean marker evidence";
CREATE LIGHTNING FILESTORE TABLE marker_reference_v1 FROM CELLORAS FORMAT JSON
  OPTIONS (PATH "file:///home/zetaris/customer-data/shared/celloras/marker-reference-v1.json", inferSchema "true");
GRANT SELECT ON LIGHTNING DATABASE TABLE CELLORAS.marker_reference_v1 TO USER "reference@celloras.com";
```

Create the application key for that GENERAL account through `/api/v1.0/auth/api-key`, with an explicit expiry; do not deploy an administrator key or temporary login JWT. The API's metastore/audit JDBC URLs must name its own database container explicitly when attached to Celloras's network: both stacks otherwise publish the DNS alias `postgres`. Mounted vendor init scripts must be readable/executable by their container users (0755); secret files remain 0600. Re-run the supplied `verify.sh` and the Celloras probe after any installation or reference change. Invalid credentials and ungranted tables fail explicitly; this bundle can report those failures as HTTP 500 rather than 401/403.

Nightshift is a separate [Meterless runtime](https://github.com/Meterless/Meterless/blob/main/docs/agent-ready/add-meterless-provider.md). This change supplies its API client, not an assumed Linux Nightshift server image. A Linux Celloras worker can call a runtime reachable over the operator's private network. OpenShell remains the working CLI runtime and retains its own sandbox cleanup.

1. Start/configure your actual Nightshift runtime and its model fleet. Set `NIGHTSHIFT_API_URL` to a worker-reachable endpoint, `NIGHTSHIFT_API_TOKEN` to its real proxy token and `NIGHTSHIFT_MODEL` to an ID returned by `/v1/models`, such as `meterless/auto`. `localhost` inside the worker means the worker container; a host runtime may need `host.docker.internal:8088`. Keep plain HTTP private.
2. Run `node --env-file=.env scripts/verify-sponsors.mjs nightshift`. This verifies `/v1/models`, performs a real structured model call and reports only the selected route/returned model. Requests include `meterless-app: celloras` and `meterless-scope: user`; inference has a 180-second limit, bounded output and strict response validation. No failed inference is automatically retried or sent to another provider.
3. After a successful probe, set `CELLORAS_AGENT_RUNTIME=nightshift` and recreate app/worker. The app still brokers and authorizes the same tools/cards. Retain OpenShell credentials/state until old sandbox leases are cleaned up. Set `CELLORAS_AGENT_RUNTIME=openshell` to switch back explicitly.

Selecting `meterless/auto` does **not** prove Nemotron usage. Configure Nemotron in the runtime fleet and verify its actual route. Health only labels Nemotron ready when the active worker received a completed response reporting a Nemotron model; if the API returns only a routing-mode ID, it stays pending. Actual model receipts are retained in the owned turn context. Nightshift/Nemotron live acceptance is blocked on runtime access as of 2026-10-25.
