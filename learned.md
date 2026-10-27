# Engineering notes

- For the Celloras story page, carry one recorded experiment through the map, agent response, review, recall and tool receipts. Disclose an excerpt as an excerpt; use genuine screenshots for product proof. Keep inactive Nightshift separate from verified Zetaris and H-MEM use.

- The latest organizer correction supplied on 27 October explicitly requires Nightshift in addition to Zetaris and a Meterless Engine. Older optional-Nightshift notes below are historical and must not drive the current submission plan.
- Nightshift's installer architecture is not the full portability story. Its unmodified ARM64 daemon can boot on the x86_64 server under explicit userspace QEMU while its JavaScript engine uses native Node 22.16.0. This custom deployment passes real API/auth/discovery checks; inference remains unverified until a provider is configured. Keep the runtime token separate from the upstream model API key.
- The free Mac M1-M4 edition is not a verified API-hosting solution: current website setup/CLI docs say it has no endpoint, contradicting the GitHub editions table. Check the shipped runtime instead of inferring capability from a table.

- Keep pitch screenshots, counts, review wording and activity links tied to the same verified experiment. A saved review paraphrase must not be presented as a verbatim agent quote.

- Keep a component’s responsibilities when renaming it or adding implementation details. In the flowchart, researcher reviews persist in PostgreSQL before H-MEM loads them on later requests; H-MEM is a module inside the orchestrator.

- Fit the flowchart against both viewport dimensions on initial load, reserving room for the zoom buttons. A width cap alone can make it taller than the screen.

- Do not use em dashes in new user-facing copy or replies. The user permits only small zoom in/out buttons around this otherwise plain flowchart.

- The technical flowchart page should contain only the diagram: no heading, introduction, stage banner or surrounding legend. Use pure black and white.

- For this technical flowchart, keep the result ultra simple: black text and shapes on a normal white page. Do not add interactive controls, panels or flowchart tests; the user explicitly rejected that scope.

- Keep the technical flowchart on a white background regardless of system theme. Scale the full diagram into view; nested pan/scroll areas obscure the overview. Provide readable step selection on narrow screens.

- For technical flowcharts, the user prefers deterministic HTML/SVG with real text and connectors over generated raster illustrations. Keep the worker, model runtime, scientific computation and persistence boundaries distinct; put deeper explanations inline on selection.

- Keep sponsor attribution factual and subtle in the product. Use a functional heading such as “Tools used”; explain each service's actual contribution without calling the interface a sponsor showcase.

- An activity page must explain the question, action, purpose and outcome before exposing implementation details. Put source links and actual result counts beside the explanation, with raw events available on demand. Simpler wording must not turn a format check into scientific validation or an empty memory search into evidence.

- Sponsor visibility needs an actual operation, purpose, time, outcome and source link. A badge or service-health state alone does not show use. Attribute providers at the operation start so failures remain identifiable; never turn a bundled reference into a Zetaris call or an empty memory search into a recalled decision. Repeated reference loads are calls, not additional unique marker evidence.
- Restarting a host development process requires its explicit data/runtime environment, not just `.env`. For this Mac checkout, dataset mounts and the OpenShell `host-config` selection were launch overrides; probe runtime health before starting real browser acceptance.

- An activity dashboard needs durable events at execution boundaries, not parsed server logs or a model-written retrospective. Commit admission and terminal status with the request; retain measured starts/ends and distinguish interrupted spans from completed work. Historical requests without instrumentation must stay explicitly incomplete.
- Published-workbook checksums and the canonical curated-reference checksum identify different objects. Compare source-delivery receipts with `contentSha256`, while retaining the workbook hash separately. A reference availability check is not automatically a remote query receipt.
- A runtime's end-to-end duration may include sandbox provisioning and cleanup. Label it as runtime execution, and leave model/token/cost fields unknown when the adapter does not report them. Keep evidence links independently owner-checked rather than trusting IDs in a saved context snapshot.

- A durable upload offset belongs to the database commit, not the temporary file length. Sync the chunk before committing the offset, truncate any uncommitted tail before a retry, and prove recovery using real interrupted bytes. Validate per-chunk hashes and freeze a whole-file checksum before importing.
- User-uploaded scientific bundles must never enter a shared public catalog. Resolve immutable project attachments after ownership checks for every map, tool execution and agent context; distinguish uploader-declared counts/build from independently verified provenance.
- A file named H5AD may contain normalized expression without a raw-count layer. Inspect its actual matrices, gene IDs, existing groups and UMAP; require an explicit raw-count declaration and reject non-integer data instead of guessing.

- Keep the short pitch separate from the technical audit. Explain what the agent evaluates and recommends; calling it only a coordinator hides its purpose. A source diagram must distinguish connected references, measured data, researcher memory and planned connectors.

- A mixed-audience pitch needs a real research question before platform terminology. Follow one verified dataset, result and decision; explain biological motivation without claiming the demo measured that outcome. Label demonstration reviews and distinguish broad sequencing-market forecasts from the addressable software market.

- Explain an agent through the work it performs: question, tool actions and reviewable result. A sponsor-only diagram or test counters do not explain user value. Show the without/with workflow and one actual sourced reply.

- A submission deck must fit the event rubric and requested pitch length. Four slides can cover problem/value, workflow, sponsor architecture and proof; avoid adding a cover or appendix when the user asks for a very short pitch.

- For a hackathon pitch, show the research problem and one concrete result before explaining infrastructure. Give the actual plot enough room to read, show sponsor receipts where they support the story, and keep detailed validation in the appendix. A repeated heading/footer template and miniature full-workspace screenshots weaken the pitch.

- A headless PDF exporter may not discover user-installed fonts even when the slide renderer does. Give the export process an explicit font configuration and inspect the PDF font table as well as the page images.

- Pitch evidence needs two separate checks: numerical implementation agreement does not establish biological annotation accuracy. Preserve that distinction in the slide itself, and use source-linked actual product captures. Inspect exported files too: presentation hyperlinks can change color in a PDF renderer even when the authoring preview looks correct.

- A rebuilt image filled Docker's 31.3 GB guest filesystem despite free host space, making the next real annotation fail with PostgreSQL SQLSTATE `53100`. Check guest capacity before large rebuilds. Removing unused build cache reclaimed 2.184 GB without touching volumes; preserve failed turns and start an explicitly fresh acceptance run after repair.
- Demonstrate the sponsor chain using the same annotation run: real reference query, measured marker plot, explicit review, recalled source and correction. Keep the original calculation and historical answer receipts unchanged, and make the saved-review follow-up carry the exact run and group.
- A source link opens its saved turn, whose generated explanation can put a lazy-loaded card below the viewport. Scroll the card into view before interacting with its contents in browser rehearsals; DOM visibility alone does not trigger its intersection observer.

- The user's final submission instructions supersede earlier sponsor-lesson interpretations: Zetaris plus one Meterless Engine are required; Celloras uses H-MEM. Nightshift, Nemotron and other NVIDIA integrations are optional. Keep requirements, working-feature proof and future product scope separate; two separate integration tests do not establish a combined recorded workflow.

- A service attached to two Compose networks can resolve a generic name such as `postgres` to the other application's database. Zetaris's API did exactly this when joined to Celloras: `postgres` resolved to 172.19.0.2, while its own database was on 172.20.0.3. Use the exact private database hostname before joining the API to the application's network; do not reset passwords in response to that authentication error.
- Keep credentials private without making mounted startup scripts unreadable to the container user. Root-owned mode 0700 on Zetaris's `init/*.sh` caused a real driver startup failure; the non-secret scripts need mode 0755 while `.env` stays 0600.

- Explicit group comparisons can score below a generic memory threshold even when both saved reviews exist. Recognize exact owned group names/IDs before hybrid ranking, retain both distinct targets, and record that selection in the retrieval trace. Do not silently relabel groups or present retrieval weight as biological confidence.

- Nightshift uses `meterless/*` routing modes and a real runtime proxy token. A successful connection or `meterless/auto` response is not proof that Nemotron executed; retain reported model receipts and verify the fleet route.
- H-MEM's upstream reference ranks memories but does not supply application tenancy or durable database transactions. Scope the engine to one owned project, persist its state/ledger atomically, and supersede biological decisions only by exact review target, not similarity heuristics.
- Zetaris's SaaS query API uses an API Bearer token plus organization/request headers. Close returned query cursors, retain only non-secret request receipts, and verify the complete marker-reference hash before allowing remote records into numerical annotation.

- Deployment-manager process arguments can embed encoded environment secrets. Inspect only process IDs/status and service-scoped health; never dump full command lines or environment values into diagnostics.

- Turbopack rewrote 84 tiny floating-point values in an imported JSON reference, changing its canonical SHA-256 while native Node verified it correctly. Read the original file at runtime, explicitly include it in standalone tracing, and check authenticated health in the built app; never relax scientific integrity checks to accommodate compiler changes.
- Store production datasets, OpenShell state and worker mTLS files outside a deployment manager’s replaceable checkout. Verify the full artifact inventory before publication and merge persistent settings without overwriting unrelated values.
- Next’s favicon decoder requires RGBA PNG entries inside an ICO. Verify the actual production build and served icon, including the baked Keycloak theme.

- A marker reference and published cluster labels from the same study can check consistency, but cannot establish independent annotation accuracy. Keep benchmark labels out of runtime scoring, preserve disagreements and expose exploratory thresholds.
- Annotation-card selection and composer selection must agree before any follow-up. Sync only explicit interactions; a lazily loaded card must not silently replace the researcher's current context.
- A latest-results limit can discard the annotation behind a follow-up after several new plots. Carry the latest annotation and a bounded set of explicitly referenced run IDs, independently checking project ownership for each.
- Next standalone output does not automatically ship public image/data files. Copy `public/` into the runtime image and verify actual asset URLs after deployment.
- OpenShell's MicroVM bootstrap image is separate from a sandbox's requested image. Updating the worker image left the running gateway trying a removed default tag before Codex could start. Write the matching bootstrap image, restart when TOML changes and require a real model probe before resuming the worker.
- A deployment system can replace a checkout directory while an unchanged container retains the old directory inode through a bind mount. Production Keycloak then missed files that existed at the same host path. Bake the theme and realm into its image; keep bind mounts for local development.
- Document overflow alone can miss a clipped grid child. Measure the chat pane itself at narrow widths; explicit `minmax(0, 1fr)` prevents content from expanding an implicit track beyond the viewport.
- An SSR button can look enabled before its handler is ready. Keep the demo action disabled until hydration, then let browser tests wait for its real enabled state instead of adding sleeps.

- Keep public demo sign-in hints in Keycloak's theme footer, configured for the existing account. Fill the real form and keep authentication unchanged; render the panel only on login, not registration. Use ignored local configuration for the displayed values.

- A near-bottom autoscroll threshold can exceed the entire scroll range. With 56px of overflow, an 80px threshold treated scrolling to the top as following the latest message. Use only a pixel-rounding tolerance at the actual bottom and preserve scroll during polling.

- Inspect the actual expression layer: this root Seurat object stores raw counts in both RNA.counts and RNA.data. Derive and name normalization explicitly; preserve SCT on its own feature axis. Compare values against an independent R calculation before plotting.
- A useful first-use experience executes a real next step and preserves the researcher’s unfinished draft. Persist selected context visibly in messages and bind suggested actions to retry identity.
- Keep full plot arrays out of model context and chat-history snapshots. Store canonical results once, resolve cards through owned endpoints and load them near the viewport.
- Treat curated literature coverage honestly. Preserve primary-source bytes locally, stable paragraph hashes and exact anchors; dynamic PMC page metadata can change its whole-page hash. An incompatible gene build is excluded evidence, not an invitation to relabel IDs.
- External data path resolution needs an explicit Turbopack tracing boundary; otherwise a dynamic filesystem path can trace the whole repository. Exclude secrets/artifacts from standalone output as well as Docker context.

- A demo login is not a prepared demo. Populate owned sample/marker records through the real application, obtain actual model/tool results, and give the presenter a short route through evidence, uncertainty and saved review. Label selected example genes as illustrative inputs rather than an analyzed sample.
- Demo preparation must resume existing submissions instead of generating another set of records and inference calls. Reconcile uniquely named owned projects before creating, preserve subsequent user decisions, and stop on failed turns or uncertain non-idempotent creation.

- Verify the source's actual annotation build and marker method before importing facts. A paper may use different builds for transcriptomics and proteomics. A blocked supplementary workbook and downloadable raw counts do not justify claiming a marker-table integration.
- Preserve malformed source identifiers as documented exclusions instead of silently fixing them. Keep unsupported symbols separate from valid gene IDs absent from a limited reference, and keep shared-marker ambiguity visible.
- A tool result and a researcher's decision are different records. Persist the canonical evidence/input/source snapshot first, then resolve an explicit review against that completed owned run. Reject client-supplied evidence and candidate labels absent from the actual result.
- Evidence links need a chat pagination cursor as well as a turn anchor. On mobile, defer anchor scrolling until the chat viewport is visible after hydration, just as following the newest message waits for a measurable viewport.

- Let model output select predefined card types and record IDs; resolve values from canonical owned records on the server. Validate both the offered catalog and database ownership, and persist the resolved snapshot so later context changes cannot rewrite an earlier answer.
- Codex's output schema applies to the final assistant message. Parse the last completed message after a successful turn, not concatenated intermediate commentary. Ship schema changes with an explicit workload image revision so cached runtimes and workers cannot silently disagree.
- Reusing a full research table inside chat can make a mobile card taller than the conversation viewport. Show compact sample facts first and put full metadata behind an expandable section.
- Assistant text needs a Markdown renderer rather than `white-space: pre-wrap`. Keep stored text unchanged; parse it only at the presentation boundary with raw HTML disabled and safe URL handling. Scope typography to messages, contain wide tables/code, and give footnote references and labels unique IDs per reply.
- Check Docker's guest filesystem when writes fail even if macOS has free space. A successful image build exhausted the guest disk and the next auth callback failed; unused build-cache cleanup restored the real registration/chat path without changing authentication code or touching volumes.

- A chat workspace needs its own scroll container and an anchored composer. A long document with research forms below chat made navigation and message entry cumbersome; keep research editing on demand and preserve component state while panels close.
- Server layouts retain client navigation state. Revalidate the owned workspace layout after creating an experiment so its sidebar includes the new project immediately.
- Render research dialogs into the document body. A history URL must open its native dialog even when the mobile study inspector is hidden; keep the editor mounted so drafts and retry IDs survive close/reopen.
- Tie a selected research record to its history cursor, so navigating to an older page cannot retain an unrelated focused record. Untouched context fields should adopt refreshed saved context, while edited drafts stay intact.
- A compact media query can initially hide chat during hydration. Observe the scroll viewport's real size before following the latest message; initial scrolling while the pane is hidden can leave mobile chat at the wrong position.

- OpenShell's Docker gateway does not remove kernel requirements. This Mac's Docker Desktop Linux 6.10.14 kernel lacks Landlock; the sandbox failed its actual ABI probe. The explicitly selected NVIDIA MicroVM runtime boots a compatible Linux guest. Keep Docker as the Linux deployment path and keep local runtime selection outside application code.
- Persist OpenShell's `XDG_STATE_HOME` as well as its database/TLS directory. Credential encryption keys default to a state directory, not `XDG_DATA_HOME`. Moving the database without its key produced "encrypted with a different key-encryption key"; preserve the key and database together, never rotate a key to work around that error.
- A detached gateway process existing is not readiness. An immediate probe after a real restart failed before the listener was ready. The managed local launcher now confirms authenticated OpenShell health before returning, and stop waits for actual process exit.
- Codex 0.163 compares the selected account ID with workspace discovery locally. An opaque OpenShell account-ID handle produces "selected workspace missing from routing discovery". Give the worker only the non-secret account ID/expiry metadata; keep the bearer token as a gateway-held provider handle and do not import the host login's refresh token.
- Use `sandbox create --detach` followed by `sandbox exec --no-tty --no-login-shell` for headless chat. This exercised the real gRPC stdin/stdout path; the create-and-attach SSH path stalled during the initial reproduction. Parse only completed assistant messages, require a completed turn, and discard raw provider errors/reasoning from application logs.
- OpenShell 0.1.5 limits sandbox names to 19 characters. Derive a short deterministic name from the turn UUID; validate that exact relationship before cleanup. Actual deletion of an already absent sandbox succeeded, which makes crash recovery after deletion safe to repeat.
- Provider profiles use optimistic versioning: export the current `resource_version` before an update. Re-importing an existing profile and updating without its version both fail. Agent setup now handles both initial creation and updates explicitly.
- Keep browser evidence in a dedicated Playwright output directory when running separate suites; Playwright clears the selected output directory at startup.

- Research context must be immutable when attached to a marker set. Store the selected context entry and its snapshot; changing the current sample must not reinterpret older clusters.
- Recent-marker limits can hide older clusters from manual review. Include markers displayed or referenced on the current history page, alongside the recent list; the regression uses 101 real marker sets.
- A save can commit while its HTTP response is lost. Keep the submission UUID on ordinary retries. If an edited draft conflicts with a committed submission, offer an explicit new-entry save; silently generating another UUID can duplicate records.
- PostgreSQL restart preserved every research record but left a stale Keycloak connection that failed the next registration. For local database maintenance, restart Keycloak as well, wait for service health, and verify a real auth flow; the app's discovery check alone does not prove registration works.
- Docker's desktop credential helper stalled an anonymous public-image build. A task-local Docker configuration without a credential store, pointed at the existing socket, completed the build without changing the user's login configuration.
- Wait for actual image decoding before capturing branding screenshots; DOM visibility alone can precede the first image paint.
- Full-page mobile capture after resizing produced repeated image tiles despite a single header in the DOM. Reloading at the target viewport produced a correct full-page capture; inspect both the full page and a scrolled viewport when checking responsive records.

- Read the current Amigospace design kit before styling screens. Celloras uses black/white, Inter or system sans, 8px controls and 400/600 weights. The earlier green/cream landing is not evidence of the agreed design direction. Do not recreate a supplied logo from a prose description; obtain its actual bytes.
- Keycloak realm import skips existing realms. A theme requires both a mounted theme directory and a saved `loginTheme` setting; `npm run auth:configure` updates and confirms theme and signup settings locally.
- User correction: signup should ask only for email/password/confirmation. First/last name do not belong in the first step. Configure their permissions and remove required rules in Keycloak; hiding required fields with CSS would break real registration. Keep the form spacious and review it as a signup experience, not only as a working provider form.
- PatternFly login defaults add desktop container padding and switch the container to block layout on mobile. Override both explicitly, scope footer padding to direct children, and inspect screenshots at both widths. Passing account-flow tests alone does not prove the layout is correct.

- Git branch naming should result in an actual branch when requested. `celloras.com` is the sole working branch; `main` is an empty baseline.
- Docker Desktop ran out of disk while extracting Keycloak. User approved clearing unused build cache; `docker builder prune --force` reclaimed 6.464 GB. No image, container or volume pruning was performed. Check capacity before repeating large pulls.
- The first PostgreSQL startup tried to execute a read-only host-mounted shell initializer and failed with `bad interpreter: Permission denied`, despite host mode 0644. Prefer a SQL initializer using psql `\getenv`; this avoids script execution through the host mount. The partially initialized database was repaired by running the exact SQL file, without deleting the volume.
- OIDC has one canonical public issuer. Rewrite only its network transport to Keycloak's internal Compose address; never bypass issuer/audience/nonce validation to fix container networking.
- Current TypeScript ESLint support requires TypeScript below 6.1; pin 6.0.3. Next.js's bundled lint plugins require ESLint 9. Pin the compatible dependency graph instead of forcing peer resolution.
- A real mobile browser check found decorative rotated ellipses caused horizontal overflow at 390px. Remove their rotation at mobile widths; do not hide all page overflow to mask layout defects.
- Tests use real accounts and projects. Keep credentials and browser traces out of artifacts and Git. Screenshots of the landing page, project and health view are sufficient for visual evidence.

- Uploaded marker lists and expression matrices support different scientific claims. Preserve original CSV bytes and immutable context, use exact compatible reference overlap for a gene list, and reserve expression/UMAP claims for a measured dataset. The included marker example comes from the reference itself and is not an accuracy benchmark.
- A selected imported group can be older than the worker’s recent 30 research records. Resolve its bounded exact handle within the owned project before building the tool catalog; retain existing ownership checks at tool execution.

- The Zetaris 2.4.3.1 hackathon JSON reader returned only the first NDJSON object. Export one JSON array and require the expected 42-row count plus canonical hash before activation. Its table grant syntax is `GRANT SELECT ON LIGHTNING DATABASE TABLE ... TO USER ...`; older generic SQL examples do not match this parser. Invalid keys may return HTTP 500; treat every non-2xx response as failure.

- For research cards, lead with the candidate/result, show the specific genes or measured plot immediately, and keep source/method detail expandable. Overlap and evidence bars must encode real counts and remain explicitly distinct from confidence.
- A scientific SVG with an intrinsic width plus `min-width: 100%` scales a small gene comparison to an excessively tall chart. Keep its actual dimensions and let the labelled plot region scroll on narrow screens.
- Element screenshots can include a fixed chat composer when the card exceeds the viewport. Inspect a realistic viewport separately, then capture the full card at sufficient viewport height; do not hide the composer to claim the responsive layout works.

- A push to this deployment can replace the checkout while a manual build is running. The manual `up` then reported `getwd: no such file or directory`, while the deployment process had already started the correct new image. Check the current checkout, container image digest and actual public browser behavior before retrying deployment commands.

- A styled accordion is still a wall of text when every gene repeats the same provenance. Structure the information first: gene → original reference species → shared study. The user rejected a side inspector: open one gene directly beneath its row and keep full provenance available inline. Read only the exact versioned saved format; never infer the original source species from a soybean gene ID or silently enrich a historical result from a new catalog.

- The annotation result must lead with the actual cell map when a visual result is requested. Use the saved suggestions with the exact version-checked measured embedding, retain unresolved/ambiguous groups, and export the same figure. A marker-only result has no cell coordinates and must not receive an invented UMAP.

- Keep chat suggestions quiet and compact. Upload belongs in the composer toolbar; repeating the selected group in each action wastes space and creates a second competing control area. Preserve the selected context once, concise verb labels and narrow-screen keyboard/touch access.

- Event resources can contradict the binding event page. On 26 October the Resource Center draft required Nightshift, while the expanded binding rules allowed any model/API and required Zetaris plus Meterless. Record exact source links and precedence instead of switching a working runtime based on the draft. A clean build, a live workflow, a finished recording and a submitted entry are distinct checks.

- Nightshift quality jobs require a Markdown rubric with weighted `## Must`, `## Should` or `## Could` criteria. Plain prose declares no criteria. Native job admission and route discovery are separate from usable inference: an accepted job can terminate with `no_ready_lane` and zero generated attempts. Never treat that as a completed review.
- Distinguish model selection from biological classification. Preserve the original numerical annotation and all comparison attempts; attach any explicit researcher decision to both source and investigation. Co-detection of selected markers is descriptive, and related cell identities need not be mutually exclusive.
- A completed evidence review should be delivered directly through the canonical card registry. An extra conversational inference call adds cost and can hide completed work if it fails. Keep normal conversation on its existing runtime.

- The Next.js build does not package or execute the separate agent worker. Every new worker module must be included in its explicit Docker COPY list. Verify the deployed worker process and database heartbeat after a push-triggered rollout, not just the web health endpoint. macOS tar streams sent into Linux containers must omit extended attributes (`COPYFILE_DISABLE=1`, `--no-xattrs`).
