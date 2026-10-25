# How Celloras uses Zetaris and Meterless

Celloras helps researchers investigate plant single-cell data through conversation. It starts with soybean roots: the agent runs expression analysis, presents provisional cell-type candidates and their evidence, then preserves the researcher's review for later work.

The required sponsor pair is **Zetaris + Meterless H-MEM**, following the submission instructions supplied on 2026-10-25. Each has a distinct job in this workflow.

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

The public Zetaris run is `af6c5691-f97c-4778-99b0-2a39b2f961bc`, with query receipt `f413c8d2-ad27-4b87-a09b-04bbc2645009`. The separate public H-MEM recall turn is `ac5121a0-b20f-4832-80f3-4c4ea9e96f21`. These establish each integration; the [submission rehearsal](submission.md) still needs to capture both in one experiment.

## Submission text

Celloras uses Zetaris to query a versioned soybean marker reference through a read-only SQL connection, verify its contents and preserve source provenance in agent-generated annotation cards. We implemented Meterless's H-MEM Engine to recall researchers' saved cell-type decisions and reasoning across conversations, with project isolation, correction history and source receipts. Real agent tests demonstrate reference retrieval and annotation through Zetaris, plus H-MEM recall beyond recent context, correction and isolation. Scientific candidates and researcher decisions remain separate so remembered interpretations cannot become published evidence.
