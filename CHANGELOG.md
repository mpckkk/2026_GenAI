# Changelog

## Documentation — 2026-10-25

- Clarified the required sponsor pair as Zetaris and Meterless H-MEM; Nightshift and NVIDIA setup are optional under the supplied submission instructions.
- Added the sponsor explanation, test pointers and a submission checklist with recording/deck outlines. The combined rehearsal, video and deck remain open deliverables.
- Separated the current Zetaris root demo from older bundled-reference examples. No runtime behavior changed.

## 0.1.20 — 2026-10-25

- Added explicit private-network HTTP configuration for the self-hosted Zetaris adapter; HTTPS remains the default.
- Added the JSON-array reference export verified against the official Linux hackathon stack, with exact 42-record content validation and a read-only application key.
- Activated Zetaris in production and verified the real agent annotation with unchanged numerical results and visible source provenance.
- Documented installation, query/grant syntax, network isolation and credential renewal. Nightshift/Nemotron activation still requires runtime setup.

## 0.1.19 — 2026-10-25

- Connected Meterless H-MEM to saved researcher reviews, with project-isolated PostgreSQL state, an append-only trust ledger and source receipts in chat.
- Preserved superseded decisions for audit while recalling the latest explicit review for each group.
- Added selectable Zetaris reference queries with exact version/hash verification and visible delivery provenance. Workspace access is still needed for live activation.
- Added a Meterless Nightshift API runtime alongside the default NVIDIA OpenShell/Codex runtime. Actual returned-model receipts distinguish routing modes from verified Nemotron execution; live runtime access is still required.
- Added provider setup/probe commands and health states that distinguish missing access from a verified connection.

## 0.1.18 — 2026-10-25

- Added CSV marker upload with column preview, grouped imports, sample context, original-file download and an included soybean example.
- Saved each import atomically with owned immutable records and safe submission retries.
- Connected uploaded groups to real OpenShell evidence cards, including groups outside recent chat context.
- Added exact Wm82v4 root marker lookup alongside the earlier root/nodule reference, with inspectable source rows.

## 0.1.17 — 2026-10-23

- Put saved experiments first, reduced the demo to a compact entry and moved new-experiment creation into an accessible dialog that preserves unfinished names.
- Added the Celloras favicon to the app and login theme.
- Fixed a production-build annotation health failure by verifying original reference JSON instead of compiler-transformed values.
- Added durable Linux runtime setup options and activated the verified root dataset plus real OpenShell/Codex worker on the public server.

## 0.1.16 — 2026-10-23

- Added provisional soybean root annotation from actual expression and a compatible published marker reference, with candidates, conflicts, missing evidence and unresolved cases.
- Added inspectable annotation cards and separate researcher label decisions with correction, history, ownership checks and safe submission retries.
- Connected annotation to guided actions and the real OpenShell tool contract; retained selected cluster and older annotation context in follow-up questions.
- Made chat suggestions compact and gave the conversation more room around the anchored composer.
- Fixed OpenShell setup retaining a stale MicroVM bootstrap image after a workload upgrade.
- Prevented early demo-button clicks before hydration and narrow-screen chat clipping.
- Simplified landing copy around one-click suggestions and replaced the technical preview caption with a source-study link.

## 0.1.15 — 2026-10-23

- Show the authors’ published cell-type names first in the landing preview, retaining source group IDs and exact nucleus counts.
- Bake the production Keycloak theme and realm into its image so checkout replacement cannot leave the login using a stale directory mount.

## 0.1.14 — 2026-10-23

- Redesigned the landing with green accents, original botanical artwork and an interactive preview of all 7,496 published root nuclei.
- Included public images and source-data assets in the standalone deployment.

## 0.1.13 — 2026-10-23

- Added `compose.prod.yaml` for the public deployment on celloras.com: production Keycloak on auth.celloras.com behind the proxy, HTTPS app URLs, no host port bindings.
- Keycloak client redirect, web origin and logout URLs now follow `CELLORAS_APP_URL` instead of a fixed localhost URL.

## 0.1.12 — 2026-10-23

- Added an optional demo login panel beneath the Keycloak form, with visible credentials and a button to fill the existing form.

## 0.1.11 — 2026-10-23

- Added a guided real soybean root demo with contextual next actions, interactive UMAP/cluster selection, descriptive marker rankings, expression overlays and dot plots.
- Added verified sparse dataset import and CPU analysis interfaces, with preserved original assays and independent R comparisons.
- Connected cited literature retrieval with source provenance and genome compatibility; incompatible marker evidence remains unresolved.
- Extended the real OpenShell agent with bounded scientific tool requests, canonical persisted result cards and separate retry-safe researcher interpretations.

## 0.1.10 — 2026-10-23

- Added authenticated local demo preparation with published soybean root and ambiguous-nodule examples, real agent evidence cards, an explicitly illustrative saved root review and a two-minute presentation guide.
- Preparation resumes through stable submission IDs, preserves existing conversations and user reviews, and produces direct links plus desktop/mobile screenshots without saving credentials or browser sessions.

## 0.1.9 — 2026-10-23

- Connected a bounded marker-evidence lookup through the real Codex/OpenShell conversation. The worker checks ownership, retrieves actual reference associations, saves their provenance and gives the result back to the agent for explanation.
- Added an extensible reference interface and a versioned soybean root/nodule source with 62 published associations across 45 genes. Missing context, incompatible builds/tissues, unsupported identifiers, shared markers and absent matches stay explicit. Overlap counts are not confidence scores.
- Added visual evidence cards with source links, competing candidates, exact matching genes and expandable methods/limits. Researchers can explicitly save a provisional candidate, unresolved result or rejection against the immutable evidence snapshot.
- Added migration 005, owned review receipts and links between research history and the original evidence turn, including long conversations and mobile reloads. Existing Markdown, saved-record cards and manual reviews remain supported.

## 0.1.8 — 2026-10-23

- Connected agent-selected sample context and marker-set cards inside chat, alongside Markdown, with compact summaries, expandable source details and follow-up draft actions.
- Added a versioned provider-neutral response contract, schema-constrained Codex output, strict validation and independent owner/project checks when resolving saved records.
- Persisted resolved card snapshots with each completed reply through an additive migration. Existing Markdown history, cancellation and retry behavior remain supported; scientific plots and annotation results still require real integrations.

## 0.1.7 — 2026-10-23

- Render assistant Markdown with proper headings, bold/italic text, nested lists, links, quotes, code, tables and footnotes, including saved conversation history.
- Contain wide tables and code inside scrollable blocks on mobile. Keep raw HTML disabled, filter unsafe URLs and show image references as links without automatically loading them.

## 0.1.6 — 2026-10-23

- Applied the accepted chat design: owned experiment sidebar, compact project header, scrollable conversation and anchored composer, with the supplied Celloras logo.
- Moved saved sample context, markers and notes into a collapsible study panel. Editing and paginated records open in a native dialog; drafts and submission IDs survive close/reopen.
- Added mobile navigation and a separate context view that keeps the chat mounted. Existing runtime, ownership, storage, cancellation and retry contracts are preserved.
- Kept the generated mockup and prompts as design references. Annotation cards and file uploads shown in the reference remain future features.

## 0.1.5 — 2026-10-23

- Connected real Codex chat through NVIDIA OpenShell, with a Docker worker, an official Docker gateway deployment path and an explicitly selected MicroVM option for local Apple Silicon development.
- Added owned PostgreSQL chat turns, exact submission retries, bounded context, cancellation, interrupted-worker recovery and cleanup before accepting another turn. Credentials remain in the gateway; the browser receives committed messages and safe status only.
- Made agent chat the primary experiment UI, retaining sample, marker and review records below it. Added live worker health and real browser acceptance checks. Reference retrieval, annotation and other scientific integrations remain pending.

## 0.1.4 — 2026-10-23

- Added a persistent conversational workspace for researcher notes, plant/sample context, marker sets and manual annotation reviews.
- Added a configurable plant catalog and generic biological-context contracts, with soybean enabled first.
- Added owner-scoped research storage, immutable context snapshots, linked reviews, idempotent submissions and paginated history through an additive migration.
- Added authenticated research APIs and predefined UI elements with truthful save/error states. Scientific agent replies and reference integrations remain pending.
- Kept older marker sets reviewable through history and added explicit new-entry recovery after a committed save loses its response.
- Applied the actual logo and black/white design kit across landing, workspace and Keycloak, preserving the original image bytes.
- Documented configuration ownership and added real migration-rehearsal and browser/service acceptance checks.

## 0.1.3 — 2026-10-23

- Added the supplied Celloras logo to the README and preserved the original PNG bytes in `docs/assets/celloras-logo.png`.

## 0.1.2 — 2026-10-23

- Simplified signup to email, password and password confirmation. First/last name are optional administrative attributes; registration and subsequent login do not require them.
- Widened registration to 560px and increased card padding and field spacing, with a separate mobile layout.
- Added the profile settings to realm import and renamed the existing setup command to `npm run auth:configure` to apply theme and signup settings to existing realms.

## 0.1.1 — 2026-10-23

- Replaced the default Keycloak login/registration appearance with the Celloras design kit: black actions, white cards, system sans, 8px controls and responsive spacing.
- Preserved Keycloak's real credential forms, password visibility controls, validation and OIDC flow; added a home link and clearer account navigation.
- Mounted the inherited theme in Compose and added explicit activation for existing local realms. The exact logo asset is still pending.
- Added browser coverage and screenshots for both forms and their validation states; verified registration, login, logout and account isolation against the running stack.

## 0.1.0 — 2026-10-23

- Created the Next.js/TypeScript workspace foundation on `celloras.com`.
- Added a responsive landing page and labelled illustrative annotation card.
- Added Keycloak authorization-code login/registration with PKCE, state and nonce validation, database-backed app sessions, and provider logout.
- Added PostgreSQL identities and owned projects, server-side access checks, project creation/reopening, and service-health pages/APIs.
- Added flat contracts and explicit pending adapters for H-MEM, Zetaris, Nemotron/Vercel, NVIDIA Files and NVIDIA observability. Unfinished annotation requests return 503 after ownership checks.
- Added local Compose, separate database roles, generated local secrets, Keycloak realm import and checksummed migrations.
- Added real browser acceptance tests and CI lint/build checks. Runtime evidence and remaining work are recorded in `docs/verification.md`.
