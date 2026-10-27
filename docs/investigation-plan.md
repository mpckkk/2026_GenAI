# Investigation of unclear cell groups

Add an optional investigation to a saved annotation. Keep OpenShell/Codex as the conversation runtime. Nightshift owns a bounded comparison job; scientific tools own measurements. Preserve the original result and require an explicit researcher decision.

## Current and intended path

Current: chat queue -> coordinator -> numerical tools / Zetaris -> saved annotation -> researcher review -> H-MEM.

Added: select an unclear group -> validate owned annotation and dataset version -> select distinguishing reference markers -> measure their per-cell detection -> Nightshift comparison job -> validate source references -> visual investigation -> explicit review linked to both results -> H-MEM recall.

The follow-up checks whether selected marker signals occur in the same nuclei or different nuclei. This is descriptive co-detection, not doublet detection, statistical significance, or proof of identity. No new literature search or species mapping is implied. Nightshift evaluates interpretations of a fixed evidence packet. Agreement is not biological confidence. An unresolved outcome is valid.

## File ledger

| Action | Files                                                                                                                                    | Purpose                                                               | Package |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| CREATE | `app/core/investigation.ts`, `app/core/investigation.mjs`, `app/core/investigation.d.mts`                                                | Typed evidence, bounded interpretations and validation                | 1       |
| CREATE | `db/migrations/012_annotation_investigation.sql`                                                                                         | Durable provider job binding and review provenance                    | 1       |
| UPDATE | `app/core/analysis.ts`, `app/core/analysis.mjs`, `app/core/annotation.ts`                                                                | Add investigation actions/results and review references               | 1       |
| UPDATE | `app/gateway/nightshift.mjs`                                                                                                             | Share the authenticated runtime client                                | 2       |
| CREATE | `app/gateway/nightshift-investigation.mjs`, `app/services/investigation.mjs`                                                             | Native bounded jobs, canonical measurements, persistence              | 2       |
| UPDATE | `app/services/analysis-tools.mjs`, `infra/agent/worker.mjs`                                                                              | Execute investigation through the existing queue and ownership checks | 3       |
| UPDATE | `app/core/agent-response.schema.json`, `app/core/agent-response.mjs`, `app/core/agent-response.d.mts`, `app/services/agent-response.mjs` | Resolve saved investigation cards                                     | 3       |
| UPDATE | `app/adapters/analysis.ts`, `app/adapters/research-memory.mjs`                                                                           | Explicit review linkage and memory provenance                         | 3       |
| UPDATE | `app/core/activity.ts`, `app/adapters/activity-events.mjs`, `app/(workspace)/app/activity/activity-copy.ts`                              | Explain actual provider jobs and follow-up checks                     | 3       |
| CREATE | `app/(workspace)/app/investigation-card.tsx`, `app/(workspace)/app/investigation-card.module.css`                                        | Visual comparison, measured overlap and explicit review               | 4       |
| UPDATE | `app/(workspace)/app/annotation-card.tsx`, `app/(workspace)/app/agent-response.tsx`, `app/(workspace)/app/next-actions.tsx`              | Entry point and finite card registry                                  | 4       |
| UPDATE | `.env.example`, `compose.yaml`                                                                                                           | Explicit additive activation                                          | 4       |
| CREATE | `scripts/verify-investigation.mjs`                                                                                                       | Real database/data/provider journey                                   | 5       |
| UPDATE | `docs/configuration.md`, `docs/verification.md`, `learned.md`, `CHANGELOG.md`                                                            | Observed evidence and operational limits                              | 5       |

Additional updated files: `app/core/analysis.d.mts`, `app/gateway/nightshift.d.mts`, `app/adapters/chat.ts`, `app/adapters/activity.ts`, `app/(workspace)/app/agent-chat.tsx`, `app/(workspace)/app/scientific-card.tsx`, `app/(workspace)/app/activity/activity-steps.ts`, `app/(workspace)/app/activity/activity-run.tsx`, `app/(workspace)/app/activity/sponsor-activity.tsx`, `infra/nightshift/README.md`. They cover declaration alignment, explicit admission/failure messages, activity attribution and existing card narrowing. The production Compose override inherits the flag without a separate edit.

The orchestrator delivers completed investigation cards directly after Nightshift validation; there is no redundant CLI call before display. This first version uses the explicit guided action, not an autonomous new model tool. Existing conversational tools remain available.

Deleted files: None. Renamed files: None. The private pitch outline is excluded from commits and pushes.

## Ordered packages and acceptance

1. Define the immutable source-run/group/evidence contract. Bind every proposed interpretation to known candidates and citation IDs. Preserve uncertainty and numerical results.
2. Execute real per-cell measurements, submit at most one native Nightshift job per admitted turn, persist its identifier, retain attempts and validate output. Ambiguous submission outcomes must not trigger automatic resubmission. Cancellation must stop the provider job.
3. Wire into the existing queue, result ownership, activity and explicit annotation reviews. Reject stale dataset versions before submission and before saving. Preserve references through H-MEM.
4. Render a compact visual result with comparisons, co-detection counts, source links and a deliberate save action. Keep the feature gated until a real provider run passes.
5. Verify real measurements, provider success/failure, ownership, reload, review and recall; inspect desktop/mobile screenshots. Deploy and push only the reviewed task files on `celloras.com`.

## Activation gate

Nightshift currently runs on the server but has no model backend configured. A provider key and usable model lanes are prerequisites for positive inference acceptance. The existing chat adapter's model catalogue is not proof of job readiness. The user has been asked which provider can be configured. Complete independent implementation while waiting; never substitute a simulated result or silently bypass Nightshift.

Rollback disables the investigation entry point. Original annotations, reviews and the existing agent runtime remain readable. New immutable results are retained. No destructive data cleanup.

## Implementation status

Packages 1 through 4 are implemented behind a disabled activation flag. Real source-file measurements, ownership/version denial, native job admission and the explicit provider-failure/database/activity path are verified. Package 5 remains incomplete for successful inference, completed-card rendering, save/reload/recall and live cancellation because no model lane is configured. See `docs/verification.md` and its sanitized receipt. Do not present this addition as a working hackathon demo until that gate passes.
