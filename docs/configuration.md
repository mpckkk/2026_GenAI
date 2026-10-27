# Configuration ownership

Celloras separates reviewed application definitions, operator configuration, credentials and research data.

| Setting                                       | Source of truth                                        | Consumer                                          |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Enabled plants and suggested tissues          | Versioned `app/plant-catalog.ts`                       | Validated `ConfiguredPlantCatalog`                |
| URLs, database and Keycloak settings          | Ignored `.env`, explicitly mapped by Compose           | Server-side application adapters                  |
| Sample context, markers and reviewed calls    | PostgreSQL research entries                            | Owned research service and agent context snapshot |
| Chat prompts, replies and execution state     | PostgreSQL `agent_turns` / `agent_workers`             | Chat service and worker                           |
| Dataset upload state and explicit selections  | PostgreSQL `dataset_uploads`                           | Owned upload API and H5AD importer                |
| Original H5AD files and private count bundles | Durable operator-selected directories                  | Importer writes; owned scientific provider reads  |
| Gateway/provider behavior                     | `infra/agent`, generated private gateway configuration | OpenShell execution adapter                       |
| Provider bearer credential                    | Private OpenShell gateway credential storage           | Gateway/supervisor provider mediation             |
| Operator account routing ID and expiry        | Private `agent-metadata.json`                          | Worker and sandbox bootstrap                      |
| Production secrets                            | Operator-managed secret store                          | Only the service that requires them               |

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

## H5AD uploads and demo download

The `h5ad-importer` service runs separately from the agent. It consumes the PostgreSQL upload queue, inspects the actual H5AD, waits for the user's explicit field selection, then publishes an immutable sparse-count bundle. It needs database access and its two data mounts; it does not use a model credential or execute file-provided code. Migration **010** adds the upload queue. Deploy the migration, app, agent worker and importer together.

| Setting                                       | Host configuration                                                                                     | Container use                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `CELLORAS_UPLOAD_DIR`                         | Local default `.artifacts/dataset-uploads`; production example `/var/lib/celloras/dataset-uploads`     | `/uploads`, writable by app and importer                                      |
| `CELLORAS_UPLOADED_DATASET_DIR`               | Local default `.artifacts/uploaded-datasets`; production example `/var/lib/celloras/uploaded-datasets` | `/uploaded-datasets`, writable by importer; read-only in app and agent worker |
| `CELLORAS_H5AD_DEMO_FILE`                     | Exact path visible to the app process; optional                                                        | Example `/datasets/examples/soybean-root-gse270392.h5ad`                      |
| `CELLORAS_H5AD_DEMO_SHA256`                   | Expected lowercase SHA-256 of that exact sample file                                                   | Required alongside the sample path                                            |
| `CELLORAS_WORKER_UID` / `CELLORAS_WORKER_GID` | Shared filesystem owner; defaults `1000:1000`                                                          | App, agent worker and importer use the same configured identity               |
| `CELLORAS_H5AD_TIMEOUT_SECONDS`               | Importer environment, set to `900` in Compose                                                          | Per-file child-process deadline                                               |
| `CELLORAS_H5AD_MEMORY_GIB`                    | Importer environment, set to `3` in Compose                                                            | Per-file child-process memory limit within the 4 GiB service limit            |

Compose's `upload-storage-init` creates the two upload directory roots and sets their owner/mode. It does not recursively change existing data. The importer has one CPU, a 4 GiB container limit, a read-only root filesystem, a 256 MiB temporary filesystem, dropped capabilities and no privilege escalation. It exposes no HTTP port. The app's upload endpoint receives 8 MiB chunks; configure the reverse proxy to permit that request size.

The host-path variables select bind mounts; Compose supplies `/uploads` and `/uploaded-datasets` to processes inside containers. A host `npm run dev` instead needs actual host paths in its environment. Likewise, `CELLORAS_H5AD_DEMO_FILE` must name an app-visible path: a container path for Compose, an absolute host path for host development.

### Prepare the small soybean sample

Generate the real 29 MB file using the [source conversion instructions](h5ad-source.md#reproduce-the-actual-file). The conversion preserves all 7,496 nuclei, 40,127 genes, original raw counts, cell groups and UMAP from the verified GSE270392 root RDS. It does not manufacture cells or labels, and it is not an author-deposited H5AD.

For the default local dataset mount, copy the generated file into its public-example directory:

```sh
mkdir -p .artifacts/scientific-data/examples
cp .artifacts/h5ad-validation/soybean-root-gse270392.h5ad .artifacts/scientific-data/examples/soybean-root-gse270392.h5ad
```

Set these nonsecret values in the app's environment, preserving other settings:

```dotenv
CELLORAS_H5AD_DEMO_FILE=/datasets/examples/soybean-root-gse270392.h5ad
CELLORAS_H5AD_DEMO_SHA256=f4c9395d190ce8e073e36ee531664c82e8bd7adaf9b29dfe64fa593088c74890
```

That checksum belongs to the verified sample build; a regenerated file has its own receipt and must use its actual checksum. Do not disable verification to accommodate different bytes. The file is served from the existing read-only public-data mount but is not inserted into the scientific catalog.

After authentication, `GET /api/datasets/demo-h5ad` streams this one configured file as `celloras-soybean-root-demo.h5ad`; `HEAD` reports availability and size. The app verifies its hash before serving it and returns `X-Content-SHA256`. No request parameter can select another file. The upload view offers **Download soybean root** when the endpoint is available. Unconfigured downloads return 404; missing or altered files fail explicitly. Private researcher uploads are never served through this endpoint.

Start the importer with the app:

```sh
docker compose up -d --build h5ad-importer app
```

For the sample, select raw count matrix `X`, gene index `_index`, group column `seurat_clusters`, embedding `X_umap`, soybean/root and `Wm82v4`. Explicitly confirm raw RNA counts. Import requires existing groups and UMAP; it does not perform read alignment, quality control, clustering or embedding computation. Files can contain other layers, but normalized expression must not be selected as raw counts. Exact gene IDs and the declared species, tissue and genome must match an annotation reference before annotation can run.

### Limits, state and deployment

Uploads are limited to 4 GiB per file and use durable, checksummed chunks. A paused upload resumes from its last committed offset after the same file is selected. Inspection/import accept at most 100,000 cells, 100,000 genes, 100 million nonzero values and 2–100 groups. Raw counts must be finite nonnegative integers, with a positive total for every cell. Existing two-dimensional UMAP coordinates are required. Duplicate gene IDs/coordinates, external or soft HDF5 links, virtual datasets and unsupported encodings fail explicitly. [Detailed format and numerical checks](h5ad-source.md#import-contract-and-resource-limits).

The queue moves through `uploading → inspect_queued → inspecting → awaiting_selection → import_queued → importing → ready`, or `failed`. Every queued file is scoped to its owner and project. The worker verifies the completed source hash before import, checks ownership again at publication and attaches the immutable dataset in the same transaction as `ready`. An experiment keeps one dataset; upload a different one into a new experiment. Private uploads are resolved only through owned project attachments, never the public dataset catalog.

`/app/health` reports **H5AD imports** from a fresh importer heartbeat and the migration check. The heartbeat contains only status and time. Worker logs record upload ID, stage and success/failure. An interrupted import fails after its lease/deadline expires; no unfinished artifact is treated as ready. Original uploads, selected fields and verified imported files are retained. Capacity planning must include staging, the retained original inside the bundle and derived sparse arrays. Retention and backup policy remain operator work.

Before a production release, create and configure both upload directories **outside Dokploy's replaceable checkout**. Publish the sample under `/var/lib/celloras/scientific-data/examples/` and verify its checksum before configuring the download. Preserve the existing `/var/lib/celloras/scientific-data` catalog, OpenShell state, sponsor configuration and PostgreSQL volume. Persist the new environment variables in Dokploy, then deploy using the existing `compose.yaml` + `compose.prod.yaml` project. Do not rely on a checkout-local `.artifacts` path for researcher data.

Local browser upload, Linux import and full numerical/map preservation passed. The complete public uploaded-data workflow also passed on **2026-10-26 at 00:50:59 UTC**: sample download and checksum, browser upload, imported map, real agent annotation with all 42 Zetaris reference associations, provisional accepted demonstration review and source-linked H-MEM recall. It produced 7 suggested, 1 ambiguous and 4 unresolved groups without changing the stored annotation after review. [Accepted experiment and receipts](demo.md#start-the-video-with-an-h5ad-upload). Repeat those checks after relevant deployment changes; acceptance of this workflow does not establish biological accuracy or complete backups/retention. Keep additive schema and uploaded artifacts on rollback; older app versions cannot read new private dataset bindings, so roll forward if those records have been created.

## Scientific integrations

General chat, the limited published marker reference, verified local sparse root analysis, provisional marker-based annotation and curated lexical literature retrieval are implemented. `CELLORAS_DATASET_DIR` is an operator-selected host directory, mounted read-only at `/datasets` in both app and worker. Its checksummed catalog fixes immutable dataset versions attached to projects. Annotation uses `data/references/soybean-annotation-v1.json` with exact species, tissue and genome compatibility. The separate source-label benchmark is never imported by runtime ranking. Reference provenance and thresholds are documented in [annotation methods](annotation-method.md).

The literature corpus is versioned in `data/literature`; it does not silently call a vector service. H-MEM recalls explicit saved reviews through the worker. Zetaris is active and verified in production; a new installation requires the setup below. The Nightshift adapter still needs real inference acceptance before activation. Independently validated annotation, verified Nemotron execution, Vercel routing, NVIDIA file storage and trace export remain pending. The authenticated health page separates working services from missing access. The scientific `/api/chat` endpoint queues owned dataset annotation through the same chat service and rejects unsupported gene-only input.

## Sponsor integrations

The latest organizer correction supplied by the user requires **Zetaris, one Meterless Engine, and Nightshift as the AI provider**. Celloras uses **H-MEM** for the Engine requirement. H-MEM runs independently of Nightshift; satisfying that Engine requirement does not establish Nightshift inference. Cursor and NVIDIA remain optional. Earlier event-page interpretations are retained as dated history, not the current implementation target. See the [sponsor explanation](sponsor-explanation.md) for working-feature evidence.

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

### Nightshift runtime

Nightshift is a separate [Meterless runtime](https://github.com/Meterless/Meterless/blob/main/docs/agent-ready/add-meterless-provider.md). The latest organizer correction requires a real Nightshift request in the demo. The [Linux container deployment](../infra/nightshift/README.md) runs the official ARM64 daemon under QEMU with a native Node engine on x86_64; this is a custom compatibility deployment, not a vendor-supported x86 release. The API has passed live health, authentication and route-discovery checks on the Celloras server. A completion currently fails explicitly with `no_provider_configured`: an upstream model API key and real inference acceptance are still missing. OpenShell remains the active Celloras runtime.

1. Start/configure your actual Nightshift runtime and its model fleet. Set `NIGHTSHIFT_API_URL` to a worker-reachable endpoint, `NIGHTSHIFT_API_TOKEN` to its real proxy token and `NIGHTSHIFT_MODEL` to an ID returned by `/v1/models`, such as `meterless/auto`. `localhost` inside the worker means the worker container; a host runtime may need `host.docker.internal:8088`. Keep plain HTTP private.
2. Run `node --env-file=.env scripts/verify-sponsors.mjs nightshift`. This verifies `/v1/models`, performs a real structured model call and reports only the selected route/returned model. Requests include `meterless-app: celloras` and `meterless-scope: user`; inference has a 180-second limit, bounded output and strict response validation. No failed inference is automatically retried or sent to another provider.
3. For the additive investigation workflow, keep `CELLORAS_AGENT_RUNTIME=openshell`. Apply migration 012, then run the investigation probe below against a real saved annotation. Enable `CELLORAS_INVESTIGATION_ENABLED=true` in both app and worker only after successful inference and the full review/recall browser journey. The flag defaults to false. The existing conversation runtime does not change.

### Investigate an unclear group

Choose **Investigate this group** on an ambiguous or unresolved annotation. The orchestrator verifies the owned saved annotation, attached dataset version and freshly loaded reference (Zetaris when configured). It selects up to two distinguishing markers from each of the two highest-scoring candidates and measures co-detection in individual nuclei. It submits one native Nightshift `best_of_n` job with three interpretations and a frozen quality rubric. It validates the returned candidate IDs and evidence references, saves a separate visual review, and delivers that result directly. It does not require another conversational model call to release the completed review. Normal conversation continues through the configured CLI/API runtime.

The card shows the actual counts, all interpretations, remaining uncertainty and an unexecuted next check. Nightshift's selected interpretation is a quality assessment, not biological confidence. The original annotation remains unchanged. An explicit saved decision links both results; H-MEM recalls it as a researcher decision, with the investigation link.

```sh
# Set CELLORAS_DATASET_DIR and the private Nightshift settings in your operator environment.
node --env-file=.env scripts/verify-investigation.mjs ANNOTATION_RUN_UUID GROUP
# Real inference probe. Requires enabled configuration and ready model lanes.
node --env-file=.env scripts/verify-investigation.mjs ANNOTATION_RUN_UUID GROUP --provider
```

The independent source-file check currently accepts public datasets in `CELLORAS_DATASET_DIR`. The application also scopes uploaded datasets through `ProjectScientificData`. Private-upload investigation acceptance remains part of the activation gate.

Operator limits: three generated interpretations, up to four measured genes and a six-minute job deadline. Nightshift's low relative attempt budget is not a dollar cap; quality evaluation can make additional model calls. Partial or invalid replies are rejected. No inference POST is retried automatically. Each admitted turn binds its job ID and evidence checksum in `investigation_jobs`; an uncertain submission blocks another active job for that source/group until the operator reconciles it. Cancellation and interrupted-turn cleanup call the native cancel endpoint. Disabling new investigations still allows cleanup of existing jobs. A failed optional cleanup is logged without blocking unrelated chat.

With an intentionally unconfigured runtime, `--failure` verifies the real `no_ready_lane` rejection, job binding and activity records in a rolled-back database transaction. It is not a successful inference test. Before enabling: verify a completed three-attempt job, reload the card, save a review, recall that exact decision, cancel a live job and confirm no model job remains active. Native job submission is verified; positive inference, cancellation during generation and the completed review journey remain blocked on a model backend as of 27 October.

Selecting `meterless/auto` does **not** prove Nemotron usage. Configure Nemotron in the runtime fleet and verify its actual route. Health only labels Nemotron ready when the active worker received a completed response reporting a Nemotron model; if the API returns only a routing-mode ID, it stays pending. Actual model receipts are retained in the owned turn context. Nightshift inference acceptance is blocked on provider configuration as of 2026-10-27. Nemotron execution is not verified.
