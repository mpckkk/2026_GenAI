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
