# Agent activity dashboard — implementation ledger

## Outcome

An owned, persistent activity dashboard inside Celloras. Researchers can move from a chat answer to its request, actual actions, evidence receipts, saved decisions, output and failures. The same recorder surrounds the runtime interface for OpenShell and API runtimes. It does not expose hidden model reasoning or invent unavailable token/cost measurements.

## Ordered packages and ownership

1. **Store worker — foundation.** Create `db/migrations/011_agent_activity.sql`, `app/core/activity.ts`, `app/adapters/activity.ts`, `app/adapters/activity-events.mjs`, `app/adapters/activity-events.d.mts`, `app/services/activity.ts`, `app/api/activity/route.ts`, `app/api/activity/[turnId]/route.ts`. Append-only events, strict metadata projection, owner checks, bounded filters/pagination, atomic admission and terminal events. Existing requests retain a null recording version.
2. **Root — execution integration.** Create `infra/agent/activity.mjs`; update `infra/agent/worker.mjs` and `app/bootstrap.ts`. Record preparation, H-MEM recall, real reference loads, scientific tools, model calls, response validation and cleanup. Preserve failure events and actual receipts. Use runtime-neutral instrumentation. No credential or raw provider payload capture.
3. **UI worker — consumers.** Create `app/(workspace)/app/activity/{page.tsx,activity-dashboard.tsx,activity-run.tsx,activity.module.css}` and `app/(workspace)/app/activity/[turnId]/page.tsx`. Update `workspace-shell.tsx` and `agent-chat.tsx` in the workspace directory. Full-page searchable request list and chronological run detail; inline disclosure, live updates, canonical output links, mobile layout and explicit legacy gaps.
4. **Root — acceptance and release.** Create `tests/agent-activity.spec.ts`; update `docs/verification.md`, `learned.md`, `CHANGELOG.md` and README as appropriate. Rehearse additive migration and ownership against real PostgreSQL; exercise a real model/annotation/review/recall workflow and cancellation through the browser. Inspect desktop/mobile screenshots. Push the shared `celloras.com` branch, verify deployment and live Zetaris receipts, save a safe evidence JSON under `docs/evidence/`, then record committed results in Amigospace.

The root integration also updates `infra/agent/Dockerfile` to include the shared event writer in the Linux worker image. No files are renamed or deleted. No new infrastructure service is required. The activity dashboard is independent of the pending NVIDIA exporter and does not imply that exporter is connected.

## Acceptance

- New chat requests create admission/terminal events atomically; new execution steps survive refresh.
- Only the owning researcher can list or open a request, source or result. Metadata rejects extra fields and records only bounded, safe values.
- Annotation shows its real dataset/version, operation, result link and Zetaris delivery receipt. Saved decisions show actual H-MEM recall and source links.
- Model steps show the configured/reported model only when available. Runtime duration includes runtime setup and cleanup where those are part of `run`.
- Cancellation/failure stays visible; an unclosed step on a terminal request is labelled interrupted, never completed.
- Historical requests have no fabricated step history.
- The public demo has fresh recorded inputs, visual results and readable trace evidence suitable for the organizer checklist. Recording the final video remains a separate deliverable.

## Delivery record

Implemented in `8e841af`; deployed with migration 011. The real local journey and 24 PostgreSQL checks passed. Fresh public H5AD → annotation → plot → review → H-MEM recall passed with live Zetaris and 51 recorded events. The acceptance receipt is `docs/evidence/agent-activity-public-2026-10-26.json`. Documentation updates also include `docs/submission.md`, `docs/sponsor-explanation.md` and `docs/technical-deck/README.md`; the exported decks were not regenerated. Amigospace's demo/checklist page was updated and confirmed at revision 5.

## Sponsor visibility follow-up — 2026-10-26

Show each sponsor's actual role, start time, duration, outcome and original receipt near the top of a request. Distinguish reference preparation from evidence used by an analysis; distinguish a memory check with no matches from recalled decisions. No sponsor attribution without a recorded provider/runtime. Old receipts stay unchanged.

Ordered file ledger (root owns this follow-up):

1. Update `app/core/activity.ts`, `app/adapters/activity-events.mjs` and `infra/agent/worker.mjs`: allow a bounded provider name and record the selected reference/memory provider at operation start, so running and failed calls remain attributable. No migration or provider configuration changes.
2. Create `app/(workspace)/app/activity/activity-steps.ts` and `sponsor-activity.tsx`; update `activity-run.tsx`, `activity-dashboard.tsx` and `activity.module.css` in that directory: share the existing step grouping, show sponsor summaries with real receipts, label matching timeline steps, and open evidence inline through accessible anchors.
3. Update `tests/agent-activity.spec.ts` for sponsor/source navigation in the real journey. Run lint/build/type checks, the real local workflow and a read-only public receipt check at desktop/mobile widths. Verify counts against saved events, not UI fixtures. Update `README.md`, `docs/verification.md`, `CHANGELOG.md`, `learned.md` and this ledger with observed results; push, verify deployment, then save the outcome in Amigospace.

No renames, deletions, new infrastructure, scientific output changes, invented queries or retrospective event writes.

Delivered as `b337e45`. Build/lint/typecheck, the extended real local browser workflow and 24 PostgreSQL checks passed. A read-only public browser check verified the existing annotation and recall traces at desktop and mobile widths after deployment. Created `docs/evidence/sponsor-activity-ui-2026-10-26.json` from that check's safe receipt; original events and result lists are unchanged. See `docs/verification.md` for scope and observed setup failures.

## Plain-language activity — 2026-10-26

The default view must explain the question, actions, outcomes and sponsor contributions to a reader with no prior product or technical context. Keep original events immutable and show raw records only through an explicit technical disclosure. Describe failed, cancelled, incomplete and unrecorded steps honestly.

File ledger and order:

1. CREATE `app/(workspace)/app/activity/activity-copy.ts`: derive readable action/result/purpose descriptions from the recorded kind, status and metadata. Explain annotation counts and unknown outcomes without inventing reasoning.
2. UPDATE `app/(workspace)/app/activity/activity-run.tsx`, `activity-steps.ts`, `sponsor-activity.tsx`, `activity-dashboard.tsx` and `activity.module.css` in the same directory: lead with the request and actual result, simplify every step and sponsor role, name the input data, and keep original technical records expandable inline.
3. UPDATE `tests/agent-activity.spec.ts`: retain real workflow verification while checking plain-language outcomes and explicit technical proof navigation. UPDATE `README.md`, `CHANGELOG.md`, `learned.md`, `docs/verification.md` and this ledger with observed acceptance. Verify actual existing public annotation/recall traces and mobile rendering, then push/deploy and confirm in Amigospace. If a public verification receipt is exported, CREATE `docs/evidence/plain-activity-ui-2026-10-26.json` from the safe observed result.

No schema/worker changes, historical rewrites, renames or deletions. Presentation is derived from the same owned API data and JSON export remains unchanged. Unknown operations retain their recorded wording instead of receiving invented explanations.

Delivered as `f8790d1`, pushed and deployed on the shared branch. Build, lint and the real local annotation/review/recall/cancellation workflow passed. The public read-only browser check confirmed the plain-language outcomes, sponsor contributions, inline proof and original source navigation against the existing annotation and recall records. Desktop and 390px screenshots were inspected; original event arrays and scientific results remain identical. Created `docs/evidence/plain-activity-ui-2026-10-26.json` from the observed public check. This is implementation verification, not a first-time-user comprehension study.
