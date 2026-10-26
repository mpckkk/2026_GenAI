# Celloras

<p align="center">
  <img src="docs/assets/celloras-logo.png" alt="Celloras — plant cell logo and wordmark" width="560" />
</p>

An agent-driven workspace for plant single-cell research, starting with soybean. All work lives on [`celloras.com`](https://github.com/mpckkk/2026_GenAI/tree/celloras.com).

Sign in and add a single-cell dataset, or open the prepared soybean demo. Explore the cell map with the agent, compare marker evidence, and save plant/sample context, marker sets, notes and reviewed cell-type decisions as structured conversation entries. PostgreSQL retains the research records and chat history. Generic plant and provider interfaces allow other plants and integrations to be added with appropriate references and validation.

The implemented chat runtime uses Codex CLI inside NVIDIA OpenShell. Real model responses have been verified through OpenShell v0.1.5 both in a Linux MicroVM on Apple Silicon and on the native Ubuntu production server. Browser acceptance is recorded separately in [verification](docs/verification.md).

The real soybean root dataset supports UMAP inspection, marker ranking, expression overlays, dot plots and provisional cell-type annotation. Annotation compares measured expression with 41 exact Wm82v4 marker genes from the atlas authors' published root reference. Cards show candidates, supporting and conflicting evidence, missing markers and unresolved cases. Researchers save their own labels separately. The method has not been independently validated; see [annotation methods and limits](docs/annotation-method.md).

Published marker lookup for roots and mature nodules and curated literature retrieval provide additional cited context with explicit genome compatibility. Coverage is a limited versioned reference, not the full atlas. See [reference scope](docs/soybean-reference.md).

## Required sponsor integrations

The hackathon submission uses **Zetaris and the Meterless H-MEM Engine** in the research workflow:

- **Zetaris supplies published evidence.** The Linux deployment queries a versioned 42-association root marker reference with a read-only account, verifies its complete content hash and retains query provenance in the annotation card. A real public agent run passed; all 12 cluster results matched the prior reference run.
- **H-MEM recalls researcher decisions.** The worker uses Meterless's pinned official reference implementation with project-owned PostgreSQL state, correction history and source receipts. Real agent checks passed for recall beyond recent context, correction and isolation. Remembered interpretations remain separate from published evidence.

The complete public workflow passed: annotation → measured-marker plot → researcher review → H-MEM recall → correction, with Zetaris and H-MEM in the same experiment. [Open the prepared demo](https://celloras.com/app/projects/786e3d61-c1b5-4255-aae3-0d3d58f69320) after using **Use demo credentials** on [login](https://celloras.com/login). Follow the [short walkthrough](docs/demo.md#open-the-ready-demo).

See the [sponsor explanation and tests](docs/sponsor-explanation.md), [setup](docs/configuration.md#sponsor-integrations) and [submission preparation](docs/submission.md). Reproduce the complete journey with `npm run demo:workflow` using the [documented environment](docs/demo.md#prepare-the-complete-workflow). The [pitch deck](docs/pitchdeck/README.md) and separate [technical deck](docs/technical-deck/README.md) are available in PowerPoint and PDF; the final video remains to be recorded.

Cursor and NVIDIA are optional under the supplied submission rules. The existing OpenShell runtime is working. Nightshift has a selectable adapter but no verified live inference; Nemotron, NeMo Files and NVIDIA tracing remain optional pending work.

## Research workflow

**Bring a dataset:** choose **Add dataset** and select an `.h5ad` file. For a small real example, sign in and use **Download soybean root** in the upload view. The authenticated `/api/datasets/demo-h5ad` endpoint serves the configured 29 MB sample; the download button appears only when that file is available.

1. Choose the file and **Upload & check file**. Transfers use 8 MiB chunks; pause and resume the same file without restarting the upload.
2. Choose its raw-count matrix, exact gene IDs, existing cell groups and UMAP. Confirm tissue, genome build and that the selected matrix contains raw RNA counts. For the sample, use `X`, **Gene index**, `seurat_clusters`, `X_umap`, **root** and `Wm82v4`.
3. Open the imported experiment, inspect the cell map and ask Celloras to suggest cell types. Compare the measured marker evidence, then accept, correct, reject or leave a label unresolved with your rationale. Further questions can retrieve published evidence and recall saved decisions.

The sample contains 7,496 real soybean root nuclei and 40,127 genes. It is a lossless conversion of the published GSE270392 RDS into H5AD, preserving raw RNA counts, existing groups and the original UMAP. It is not an author-deposited H5AD or raw sequencing reads. [Source, checksums and reproduction](docs/h5ad-source.md).

Uploads accept files up to **4 GiB**, with at most 100,000 cells, 100,000 genes, 100 million nonzero counts and 2–100 existing groups. An existing two-dimensional UMAP is required. Import does not perform read alignment, QC, clustering or UMAP. The current annotation panel supports **soybean root, Wm82v4, exact Glyma IDs**; other tissues/builds can be imported for exploration but are not silently mapped to this panel.

The complete public upload → agent annotation → Zetaris evidence → review → Meterless H-MEM recall workflow passed on **2026-10-26**. The imported dataset retained all 7,496 map points and produced 7 suggested, 1 ambiguous and 4 unresolved groups. [Open the uploaded-data video demo](https://celloras.com/app/projects/fd21eefc-6a63-4c06-89fd-007ed138c77f) after signing in. Group 6 has a Root hair candidate and a clearly labelled provisional accepted demonstration review; its numerical result remains unchanged. [Walkthrough and receipts](docs/demo.md#start-the-video-with-an-h5ad-upload).

**Start immediately:** **Explore soybean root demo** opens the existing published dataset with suggested next actions in chat. Choose **Annotate all clusters**, inspect expression or retrieve papers. The administrator's original RDS import instructions remain in [dataset import](docs/dataset-import.md); the walkthrough is in [the demo guide](docs/demo.md).

For your own marker table, open an experiment and choose **Upload markers** above the composer. Upload a CSV exported from Excel or choose **Use example**, check the group/gene columns and sample context, then import and select **Find cell-type evidence**. The original file, grouped genes and context are saved together. See [CSV format and limits](docs/marker-upload.md).

For the earlier marker-reference examples, use the [demo guide](docs/demo.md). With the bundled `published` reference provider selected locally, `npm run demo:prepare` signs in with supplied credentials and prepares root and nodule examples through the real agent; it can resume without duplicating completed runs. These older examples are separate from the active Zetaris root demonstration.

1. Create or reopen an experiment from the sidebar and send a message to the agent. The composer stays visible while the conversation scrolls.
2. Open **Study context → Edit context** to save tissue, sample, developmental stage and genome/identifier context. Unknown details can stay empty.
3. Use **Add markers** in the study panel to save a cluster's gene list: 1–200 distinct identifiers, with original text and case preserved. Exact duplicate tokens are removed only from the separate normalized list.
4. Ask the agent to **look up published marker evidence** for a saved marker set. Root lookup supports the Wm82v4 atlas literature panel; the earlier root/nodule reference uses `Glycine_max_v2.1.52`. Each lookup requires its attached tissue, actual genome version and `Glyma` namespace. Missing or incompatible context stays unresolved; identifiers/builds are never silently converted.
5. Expand candidate genes and source links in the evidence card, then **Review and save your decision**. Choose a provisional candidate, keep it unresolved, or reject the evidence. Manual reviews remain available in **Research records → Edit research → Record review**.
6. Browse saved records and older entries in the research dialog. Each marker set retains its original context when the current sample changes. Closing the dialog preserves unfinished drafts.

On mobile, **Study context** opens a separate view and **Back to chat** returns to the conversation. The menu contains experiments, service health and logout. The workspace follows the accepted [chat mockup](docs/mockups/celloras-chat-v1.png); its layout guides the working chat; the evidence card displays actual lookup results.

The agent receives bounded owned conversation/research history and the latest sample context. Researcher-supplied evidence remains unverified. Replies combine Markdown with predefined **sample context**, **marker-set**, and **published evidence cards**. Save context/markers in Study context, then ask **“Show my saved sample and markers as cards.”** Cards show actual saved records, retain the data used for that reply, and expose expandable details. **Ask about this** adds a follow-up to your draft without sending or replacing it.

The server validates card types and resolves record IDs within the owned experiment; the model does not supply card data or executable markup. Existing Markdown history still renders. Raw HTML is disabled and image references are links. Scientific plots and annotation cards resolve saved real tool results through an authenticated endpoint. Descriptive scores are not probabilities or differential-expression significance tests.

A turn shows queued/running/completed/failed/cancelled status. Repeating the same submission returns its saved result; changed content requires a new submission. Each experiment permits one active turn. Cancellation targets that turn's sandbox. A failed or interrupted execution is not automatically repeated, and another turn cannot start while sandbox cleanup is outstanding.

## Run locally

Use Node 22.22.0 (`.nvmrc`), npm, Docker Compose and an installed Codex CLI. Start the workspace first; `setup` creates an ignored `.env` and refuses to overwrite an existing one.

```sh
npm ci
npm run setup
docker compose up -d --build h5ad-importer app
```

To enable the real root demo, download the GEO file linked in the dataset guide and import its verified public source before opening it (requires Docker and the pinned R image described in the import guide):

```sh
npm run data:import -- --source /absolute/path/GSE270392_Gm_atlas_Root.rna.seurat.obj.rds.gz
```

Compose mounts the directory selected by `CELLORAS_DATASET_DIR` (locally `.artifacts/scientific-data`) read-only into the app and worker. The separate `h5ad-importer` service processes owned uploads; it needs no model credential. Upload staging and private imported bundles use `CELLORAS_UPLOAD_DIR` and `CELLORAS_UPLOADED_DATASET_DIR`. Configure the optional downloadable sample using the [H5AD setup](docs/configuration.md#h5ad-uploads-and-demo-download). It does not mount the private OpenShell directory as scientific data. The curated paper collection is bundled; `npm run literature:import` explicitly refreshes it from verified primary sources. Large dataset bytes remain outside Git.

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
docker compose up -d postgres keycloak h5ad-importer
npm run db:migrate
npm run dev
```

Host development also needs the upload paths in `.env`; use an absolute host path for `CELLORAS_H5AD_DEMO_FILE`, while the Compose app uses its container path. See [H5AD configuration](docs/configuration.md#h5ad-uploads-and-demo-download).

Ports are app 3100, Keycloak 8180 and PostgreSQL 5434. Changing the app URL also requires updating Keycloak's exact callback/logout URLs. For an existing realm, `npm run auth:configure` applies the current theme and signup configuration while preserving user data. `npm run brand:sync` copies the supplied logo and Celloras favicon into the auth theme; builds run it automatically.

```sh
npm run lint
npm run typecheck
npm run build
npm run verify:storage
npm run test:e2e
```

Browser tests use local Google Chrome, real Keycloak users and persisted test records. Keep the local services running; do not point the suite at production. Screenshots are ignored and authentication traces are disabled. `verify:storage` uses uniquely named temporary local databases and removes only those databases.

`/api/health/live` reports process liveness. `/api/health/ready` checks schema, Keycloak and the bundled references. `/app/health` separately shows worker availability and pending integrations. New chat turns require a ready worker heartbeat within 30 seconds; existing records remain accessible when it is offline. The scientific `/api/chat` authorizes ownership and queues the same annotation action using `projectId`, `submissionId`, `datasetId` and an optional `cluster`; unsupported gene-only requests return 400.

See [architecture](docs/architecture.md), [configuration](docs/configuration.md), [verification](docs/verification.md), [implementation plan](PLAN.md) and the [Amigospace project](https://space.heyamigo.org/items/6223ea67-f6b0-4dfd-b8f5-0325f391d4e0).

## Deployment status

Public deployment: https://celloras.com (login on https://auth.celloras.com), run by Dokploy from this branch with `compose.yaml` + `compose.prod.yaml`. A new commit on `celloras.com` is deployed automatically within about a minute.

Base Compose is local development configuration, including Keycloak `start-dev`. The public deployment uses `compose.prod.yaml` for production Keycloak, HTTPS origins and proxy routing. The verified scientific dataset and OpenShell runtime live outside the replaceable checkout under `/var/lib/celloras`; see [production setup](docs/configuration.md#durable-state-and-deployment). The actual Linux sandbox probe and public annotation journey passed; the worker, dataset and annotation health checks are ready. SMTP, backups and retention remain separate operational work. Local email verification/password recovery are disabled, and app sessions expire after one hour without centralized backchannel revocation.

Realm import creates missing realms but does not update existing ones. Apply future auth changes through explicit configuration/migrations. SQL migrations are checksummed; add a migration instead of editing an applied file.
