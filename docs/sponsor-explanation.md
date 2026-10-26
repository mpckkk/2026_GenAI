# How Celloras uses Zetaris and Meterless

Celloras helps researchers investigate plant single-cell data through conversation. It starts with soybean roots: the agent runs expression analysis, presents provisional cell-type candidates and their evidence, then preserves the researcher's review for later work.

The required sponsor pair is **Zetaris + Meterless H-MEM**. The [binding event rules](https://hackathon.genai.works/event/open-agent-hackathon-2026#rules), checked on 26 October, require Zetaris and Meterless and allow any model/API. Each has a distinct job in this workflow.

## Zetaris: retrieve the published reference

The annotation tool queries `CELLORAS.marker_reference_v1` through Zetaris's SQL API. This table contains 42 published marker associations covering 41 distinct Wm82v4 genes and nine root cell types. It is the versioned reference used to compare measured expression in 7,496 nuclei across 12 source clusters.

Celloras runs the official Zetaris hackathon stack in a separate Docker Compose project on its Linux server. A dedicated application account has SELECT access only to this table. Administration stays on loopback; the app reaches the API over a private Docker network. Credentials stay outside the repository and browser.

The [adapter](../app/adapters/zetaris-reference.mjs) verifies the complete reference version and content hash before analysis, closes the query cursor and retains a non-secret query receipt. The annotation card shows the reference's delivery provenance. Failed access or changed content stops the operation; it does not silently substitute a local reference.

**Why it matters:** published reference access has its own permissions and provenance, separate from the model and analysis code. The demonstrated scope is one pinned reference table. Multi-source federation, full-atlas coverage and large matrix ingestion through Zetaris have not been demonstrated.

## Meterless H-MEM: recall the researcher's decision

Celloras implements the **H-MEM Engine**, using Meterless's [official reference at revision `1742dec`](https://github.com/Meterless/Meterless/tree/1742dec56a66e58eef9dda2d2b865823758ca8cd/engines/hmem). The [vendored source, license and manifest](../third_party/meterless-hmem/README.md) are included in the repository.

The [application adapter](../app/adapters/research-memory.mjs) ingests explicit saved reviews when an owned agent turn starts. H-MEM ranks relevant decisions using its reference hashed embeddings and hybrid retrieval. The worker receives up to five memories with canonical source references; chat exposes a recalled-decision receipt.

PostgreSQL retains project-owned engine state and an append-only ledger. A correction supersedes only the same review target: an annotation run plus cluster, or a marker-set record. It does not relabel other groups or rewrite earlier answers. Reviews from a different analysis run remain separate. Account and project ownership are enforced before retrieval.

**Why it matters:** researchers can return to an older decision and its rationale after it leaves recent conversation context. A remembered decision remains a researcher's interpretation, never new published evidence or biological validation. Automatic memory mining, dreaming and semantic conflict resolution are disabled. H-MEM runs in the existing worker; Nightshift, a hosted memory service and a GPU are not required.

## Evidence that it works

These are recorded live results from 2026-10-25, not a claim that every check ran again during this documentation update. Full observations are in [verification](verification.md).

| Integration | Observed result                                                                                                                                                                                                              | Reproduction entry point                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Zetaris     | All nine vendor checks passed. A real public agent turn retrieved all 42 associations; all 12 full cluster results matched the previous reference run, with visible query provenance.                                        | [Setup and real SQL probe](configuration.md#sponsor-integrations), then **Explore soybean root demo → Annotate all clusters**     |
| H-MEM       | All 13 upstream conformance checks passed. A real public agent recalled a saved review beyond 31 newer notes with its source. Local browser checks also verified correction, distinct-group retention and account isolation. | [Reference conformance runner](../third_party/meterless-hmem/README.md), [real browser journey](../tests/research-memory.spec.ts) |

The [complete public demo](demo.md#open-the-ready-demo) now captures both sponsors in the same experiment. Annotation run `af2c9005-6be1-4f7c-baf4-dede8d06155c` queried all 42 reference associations through Zetaris, receipt `f7fbb611-05df-4f96-83c8-efe2e60e8d32`. The researcher then saved a provisional review and withdrew it. H-MEM recall turns `65facd5a-7116-4c72-8115-fa09d923913c` and `caf0379c-ae9f-4631-9af3-bc77bc6be142` cite `annotation-review:99205323-3aa8-4fb2-b9ae-a48d98e67d77` and `annotation-review:f490e1a7-6d16-4eda-8e04-e51eb1a5d2c9`, respectively. The computed result and the earlier answer's source receipt stayed unchanged. A complete replay reused the same turns, query, plot and reviews.

Run `CELLORAS_DEMO_URL=https://celloras.com npm run demo:workflow` to resume this prepared demonstration through real authentication. The [script](../scripts/prepare-workflow-demo.mjs) requires actual Zetaris provenance on the public deployment and stops on failures or later researcher edits.

## Visible sponsor activity

The latest uploaded-data rehearsal also exposes both integrations in [Celloras's activity dashboard](https://celloras.com/app/activity?projectId=7bdae43c-5cd2-4203-a571-e73b445985db). Open the annotation request's **Retrieve marker evidence** step for the actual Zetaris query receipt and checksum. Open the later recall request's **Recall saved decisions** step for the exact H-MEM source and original review. The [26 October receipt](evidence/agent-activity-public-2026-10-26.json) records all three completed requests and their persisted events. This is the native Celloras dashboard, separate from the optional NVIDIA exporter.

## Submission text

Celloras uses Zetaris to query a versioned soybean marker reference through a read-only SQL connection, verify its contents and preserve source provenance in agent-generated annotation cards. We implemented Meterless's H-MEM Engine to recall researchers' saved cell-type decisions and reasoning across conversations, with project isolation, correction history and source receipts. Real agent tests demonstrate reference retrieval and annotation through Zetaris, plus H-MEM recall beyond recent context, correction and isolation. Scientific candidates and researcher decisions remain separate so remembered interpretations cannot become published evidence.

NVIDIA OpenShell runs the verified Codex CLI adapter in a sandbox on the Linux server. The runtime interface also has an HTTP adapter for Nightshift, but live Nightshift/Nemotron inference is not part of the demonstrated result. Development used Codex assistance; this submission does not claim Cursor usage or the Nemotron award. Celloras's native activity dashboard records the actual tool and runtime steps without exposing credentials or hidden model reasoning.
