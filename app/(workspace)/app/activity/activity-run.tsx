"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  ActivityData,
  ActivityEvent,
  ActivityRunDetail,
} from "@/app/core/activity";
import { MarkdownMessage } from "@/app/components/markdown-message";
import { WorkspaceIcon, type IconName } from "../workspace-icons";
import {
  activityError,
  dateLabel,
  durationLabel,
  Status,
} from "./activity-dashboard";
import styles from "./activity.module.css";

type Step = {
  id: string;
  first: ActivityEvent;
  last: ActivityEvent;
  events: ActivityEvent[];
  data: ActivityData;
  children: Step[];
};

function groupSteps(events: ActivityEvent[]) {
  const spans = new Map<string, Step>();
  for (const event of events) {
    const existing = spans.get(event.spanId);
    if (existing) {
      existing.last = event;
      existing.events.push(event);
      existing.data = { ...existing.data, ...event.data };
    } else
      spans.set(event.spanId, {
        id: event.spanId,
        first: event,
        last: event,
        events: [event],
        data: event.data,
        children: [],
      });
  }
  const roots: Step[] = [];
  for (const step of spans.values()) {
    const parent = step.first.parentSpanId
      ? spans.get(step.first.parentSpanId)
      : undefined;
    // An absent parent is still an actual recorded step and remains visible.
    if (parent && parent !== step && parent.first.parentSpanId !== step.id)
      parent.children.push(step);
    else roots.push(step);
  }
  return { roots, count: spans.size };
}

function stepStatus(step: Step, run: ActivityRunDetail["run"]) {
  if (step.last.phase === "started") {
    if (run.status === "cancelled") return "cancelled";
    if (
      step.last.interrupted ||
      run.status === "completed" ||
      run.status === "failed"
    )
      return "interrupted";
    return "running";
  }
  return step.last.phase;
}

const stepIcons: Record<ActivityEvent["kind"], IconName> = {
  queue: "chat",
  context: "flask",
  memory: "book",
  model: "activity",
  tool: "grid",
  reference: "search",
  response: "chat",
  cleanup: "label",
};

function timeOfDay(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fact(label: string, value: ReactNode) {
  return value === undefined || value === null ? null : (
    <div key={label}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StepData({
  data,
  detail,
}: {
  data: ActivityData;
  detail: ActivityRunDetail;
}) {
  const result = detail.results.find((item) => item.id === data.resultId);
  const reference = data.reference;
  return (
    <dl className={styles.dataList}>
      {fact("Operation", data.operation)}
      {fact(
        "Dataset",
        detail.dataset && data.datasetId === detail.dataset.id
          ? detail.dataset.name || data.datasetId
          : data.datasetId,
      )}
      {fact("Dataset version", data.artifactVersion)}
      {fact("Cell group", data.cluster)}
      {data.genes?.length
        ? fact(
            "Genes",
            <ul className={styles.values}>
              {data.genes.map((gene) => (
                <li key={gene}>
                  <code>{gene}</code>
                </li>
              ))}
            </ul>,
          )
        : null}
      {fact("Runtime", data.runtime)}
      {fact("Model", data.model)}
      {fact(
        "Input size",
        data.inputBytes !== undefined
          ? `${data.inputBytes.toLocaleString()} bytes`
          : undefined,
      )}
      {data.contextCounts &&
        fact(
          "Context used",
          <dl className={styles.dataList}>
            {fact("Earlier turns", data.contextCounts.turns)}
            {fact("Research records", data.contextCounts.researchEntries)}
            {fact("Saved analyses", data.contextCounts.analysisRuns)}
            {fact("Marker lists", data.contextCounts.markers)}
          </dl>,
        )}
      {fact("Saved memories", data.memoryCount)}
      {!!data.sourceIds?.length &&
        fact(
          "Sources",
          <ul className={styles.values}>
            {data.sourceIds.map((source, index) => {
              const memory = detail.memory.find(
                (item) => item.source === source,
              );
              return (
                <li key={source}>
                  {memory ? (
                    <Link className={styles.textLink} href={memory.href}>
                      Saved review {index + 1} ↗
                    </Link>
                  ) : (
                    <code>{source}</code>
                  )}
                </li>
              );
            })}
          </ul>,
        )}
      {reference &&
        fact(
          "Reference retrieval",
          <dl className={styles.dataList}>
            {fact("Provider", reference.provider)}
            {fact("Records verified", reference.recordCount)}
            {fact(
              "Retrieved at",
              reference.retrievedAt
                ? dateLabel(reference.retrievedAt)
                : undefined,
            )}
            {fact(
              "Query ID",
              reference.requestId ? (
                <code>{reference.requestId}</code>
              ) : undefined,
            )}
            {fact(
              "Content SHA-256",
              reference.contentSha256 ? (
                <code>{reference.contentSha256}</code>
              ) : undefined,
            )}
          </dl>,
        )}
      {data.outputCounts &&
        fact(
          "Output",
          <dl className={styles.dataList}>
            {fact("Response blocks", data.outputCounts.blocks)}
            {fact("Characters", data.outputCounts.characters)}
            {fact("Saved results", data.outputCounts.results)}
            {fact("Cell groups", data.outputCounts.clusters)}
            {fact("Suggested", data.outputCounts.suggested)}
            {fact("Ambiguous", data.outputCounts.ambiguous)}
            {fact("Unresolved", data.outputCounts.unresolved)}
          </dl>,
        )}
      {fact(
        "Saved result",
        result ? (
          <Link href={result.href}>{result.title} ↗</Link>
        ) : data.resultId ? (
          <code>{data.resultId}</code>
        ) : undefined,
      )}
      {fact("Decision", data.decision)}
      {fact(
        "Error code",
        data.errorCode ? <code>{data.errorCode}</code> : undefined,
      )}
    </dl>
  );
}

function TimelineStep({
  step,
  detail,
  depth = 0,
}: {
  step: Step;
  detail: ActivityRunDetail;
  depth?: number;
}) {
  const status = stepStatus(step, detail.run);
  const duration = step.last.durationMs ?? step.data.durationMs;
  const hasDetails =
    Object.keys(step.data).length > 0 || step.events.length > 1;
  return (
    <li
      className={styles.step}
      data-activity-kind={step.first.kind}
      data-activity-status={status}
    >
      <span className={styles.stepMark} data-status={status}>
        <WorkspaceIcon
          name={stepIcons[step.first.kind]}
          size={depth ? 11 : 14}
        />
      </span>
      <div className={styles.stepHeader}>
        <h3>{step.last.name}</h3>
        <div className={styles.stepTiming}>
          <Status status={status} />
          {duration !== undefined && <span>{durationLabel(duration)}</span>}
          <time dateTime={step.first.createdAt}>
            {timeOfDay(step.first.createdAt)}
          </time>
        </div>
      </div>
      <p className={styles.stepSummary}>
        {status === "interrupted"
          ? `${step.last.summary} Completion was not recorded before this request stopped.`
          : status === "cancelled" && step.last.phase === "started"
            ? "This step was still open when the request was cancelled."
            : step.last.summary}
      </p>
      {hasDetails && (
        <details className={styles.stepDetails}>
          <summary>
            {step.first.kind === "reference"
              ? "View source verification"
              : step.first.kind === "tool"
                ? "View inputs and result"
                : step.first.kind === "memory"
                  ? "View recalled sources"
                  : "View details"}
          </summary>
          <div className={styles.detailBody}>
            <StepData data={step.data} detail={detail} />
            {step.events.length > 1 && (
              <ol
                className={styles.eventHistory}
                aria-label={`${step.last.name} recorded events`}
              >
                {step.events.map((event) => (
                  <li key={event.id}>
                    <time dateTime={event.createdAt}>
                      {timeOfDay(event.createdAt)}
                    </time>
                    <p>{event.summary}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </details>
      )}
      {step.children.length > 0 && (
        <ol className={styles.children} aria-label={`${step.last.name} steps`}>
          {step.children.map((child) => (
            <TimelineStep
              key={child.id}
              step={child}
              detail={detail}
              depth={depth + 1}
            />
          ))}
        </ol>
      )}
    </li>
  );
}

function MemoryContent({ content }: { content: string }) {
  let value: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      value = parsed as Record<string, unknown>;
  } catch {
    /* Older plain-text memories remain readable as recorded. */
  }
  if (!value) return <p>{content}</p>;
  const title =
    typeof value.cellType === "string"
      ? value.cellType
      : typeof value.decision === "string"
        ? value.decision
        : "Saved review";
  return (
    <>
      <h3>
        {title}
        {typeof value.cluster === "string"
          ? ` · group ${value.cluster}`
          : typeof value.markerSet === "string"
            ? ` · ${value.markerSet}`
            : ""}
      </h3>
      {typeof value.decision === "string" &&
        typeof value.cellType === "string" && <p>{value.decision}</p>}
      {typeof value.note === "string" && value.note && <p>{value.note}</p>}
      {!value.note && !value.decision && (
        <p>This saved review was included in the agent’s context.</p>
      )}
    </>
  );
}

export function ActivityRun({ turnId }: { turnId: string }) {
  const [snapshot, setSnapshot] = useState<ActivityRunDetail | null>(null);
  const [observedAt, setObservedAt] = useState(0);
  const [problem, setProblem] = useState<{
    turnId: string;
    message: string;
    unauthorized: boolean;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const detail = snapshot?.run.id === turnId ? snapshot : null;
  const error = problem?.turnId === turnId ? problem : null;
  const grouped = useMemo(
    () => groupSteps(detail?.events ?? []),
    [detail?.events],
  );

  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    let fetching = false;
    async function refresh() {
      if (fetching || controller.signal.aborted) return;
      fetching = true;
      let repeat = true;
      try {
        const response = await fetch(
          `/api/activity/${encodeURIComponent(turnId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) {
          const message = await activityError(response);
          if (!controller.signal.aborted)
            setProblem({
              turnId,
              message,
              unauthorized: response.status === 401,
            });
          repeat = response.status !== 401 && response.status !== 404;
          return;
        }
        const next: ActivityRunDetail = await response.json();
        if (controller.signal.aborted) return;
        setSnapshot(next);
        setObservedAt(Date.now());
        setProblem(null);
        // A terminal response can be committed just before its cleanup receipt.
        repeat =
          next.run.status === "queued" ||
          next.run.status === "running" ||
          Boolean(
            next.run.finishedAt &&
            Date.now() - Date.parse(next.run.finishedAt) < 60000,
          );
      } catch {
        if (!controller.signal.aborted)
          setProblem({
            turnId,
            message:
              "Connection lost. These are the last saved steps; updates will retry.",
            unauthorized: false,
          });
      } finally {
        fetching = false;
        if (repeat && !controller.signal.aborted)
          timer = window.setTimeout(() => {
            void refresh();
          }, 3000);
      }
    }
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [turnId, refreshKey]);

  function download() {
    if (!detail) return;
    const blob = new Blob([JSON.stringify(detail, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `celloras-activity-${detail.run.id}.json`;
    link.click();
    URL.revokeObjectURL(href);
  }

  const active =
    detail?.run.status === "running" || detail?.run.status === "queued";
  const conversationHref = detail
    ? `/app/projects/${detail.run.projectId}?chatBefore=${(BigInt(detail.run.position) + 1n).toString()}#turn-${detail.run.id}`
    : "/app";
  return (
    <div className={styles.page}>
      <div className={styles.back}>
        <Link href="/app/activity" className={styles.textLink}>
          ← All activity
        </Link>
      </div>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {detail?.run.projectName ?? "Behind each answer"}
          </p>
          <h1>Request activity</h1>
          <p className={styles.description}>
            The recorded steps, sources, and results for this request.
          </p>
        </div>
        {detail && (
          <Link
            href={detail.response?.href ?? conversationHref}
            className={styles.button}
          >
            Open conversation <WorkspaceIcon name="chevron" size={14} />
          </Link>
        )}
      </header>
      {error && (
        <div className={styles.notice} data-error="true" role="alert">
          <p>{error.message}</p>
          {error.unauthorized ? (
            <Link
              className={styles.button}
              href={`/login?returnTo=${encodeURIComponent(`/app/activity/${turnId}`)}`}
            >
              Sign in
            </Link>
          ) : (
            <button
              className={styles.button}
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {!detail && !error && (
        <div className={styles.empty} role="status">
          <p>Loading the recorded activity…</p>
        </div>
      )}
      {detail && (
        <>
          <section className={styles.request} aria-labelledby="request-heading">
            <h2 id="request-heading">You asked</h2>
            <p>{detail.run.prompt}</p>
          </section>
          <dl className={styles.runFacts}>
            <div>
              <dt>Status</dt>
              <dd>
                <Status status={detail.run.status} />
              </dd>
            </div>
            <div>
              <dt>{active ? "Elapsed since start" : "Duration"}</dt>
              <dd>
                {active && detail.run.startedAt
                  ? durationLabel(observedAt - Date.parse(detail.run.startedAt))
                  : durationLabel(detail.run.durationMs)}
              </dd>
            </div>
            <div>
              <dt>Tools used</dt>
              <dd>
                {detail.run.recordingVersion === null
                  ? "Not recorded"
                  : detail.run.toolCount}
              </dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{detail.run.runtime ?? "Not reported"}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{detail.run.model ?? "Not reported"}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>
                <time dateTime={detail.run.createdAt}>
                  {dateLabel(detail.run.createdAt)}
                </time>
              </dd>
            </div>
          </dl>
          {detail.run.status === "failed" && (
            <div className={styles.notice} data-error="true">
              <div>
                <p>
                  <strong>This request stopped before it finished.</strong>
                </p>
                <p>
                The recorded steps remain available below. You can retry from
                the conversation.
                </p>
                {detail.run.errorCode && (
                  <p>
                    Error: <code>{detail.run.errorCode}</code>
                  </p>
                )}
              </div>
              <Link href={conversationHref} className={styles.textLink}>
                Open conversation →
              </Link>
            </div>
          )}
          {detail.run.status === "cancelled" && (
            <div className={styles.notice}>
              <p>
                This request was cancelled. Steps completed before cancellation
                remain available below.
              </p>
            </div>
          )}
          {detail.run.recordingVersion === null ? (
            <div className={styles.notice}>
              <div>
                <p>
                  <strong>
                    Detailed activity was not recorded for this run.
                  </strong>
                </p>
                <p>
                  It predates activity recording. Any original answer, saved
                  results, and recalled reviews are shown below.
                </p>
              </div>
            </div>
          ) : (
            <section
              className={styles.section}
              aria-labelledby="timeline-heading"
            >
              <div className={styles.sectionHeading}>
                <h2 id="timeline-heading">Step by step</h2>
                {active && !error ? (
                  <span className={styles.live} role="status">
                    Updating live
                  </span>
                ) : (
                  <span>
                    {grouped.count} recorded{" "}
                    {grouped.count === 1 ? "step" : "steps"}
                  </span>
                )}
              </div>
              {grouped.roots.length ? (
                <ol
                  className={styles.timeline}
                  aria-label="Recorded agent steps"
                >
                  {grouped.roots.map((step) => (
                    <TimelineStep key={step.id} step={step} detail={detail} />
                  ))}
                </ol>
              ) : (
                <p className={styles.description}>
                  {active
                    ? "Waiting for the first recorded step. This page will update as the agent works."
                    : "No activity steps were recorded for this request."}
                </p>
              )}
            </section>
          )}
          {detail.results.length > 0 && (
            <section
              className={styles.section}
              aria-labelledby="results-heading"
            >
              <div className={styles.sectionHeading}>
                <h2 id="results-heading">Saved results</h2>
                <span>
                  {detail.results.length}{" "}
                  {detail.results.length === 1 ? "result" : "results"}
                </span>
              </div>
              <ul className={styles.outputList}>
                {detail.results.map((result) => (
                  <li key={result.id}>
                    <Link href={result.href}>
                      <div>
                        <strong>{result.title}</strong>
                        <p>{result.summary}</p>
                      </div>
                      <WorkspaceIcon name="chevron" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {detail.memory.length > 0 && (
            <section
              className={styles.section}
              aria-labelledby="memory-heading"
            >
              <div className={styles.sectionHeading}>
                <h2 id="memory-heading">Reviews the agent recalled</h2>
                <span>Meterless H-MEM</span>
              </div>
              <ul className={styles.memoryList}>
                {detail.memory.map((item) => (
                  <li key={item.source}>
                    <MemoryContent content={item.content} />
                    <Link href={item.href}>
                      View original review · {dateLabel(item.savedAt)} ↗
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {detail.response && (
            <section
              className={styles.section}
              aria-labelledby="answer-heading"
            >
              <div className={styles.sectionHeading}>
                <h2 id="answer-heading">Final answer</h2>
                <Link className={styles.textLink} href={detail.response.href}>
                  View answer and visual results →
                </Link>
              </div>
              <div className={styles.answer}>
                <MarkdownMessage>{detail.response.text}</MarkdownMessage>
              </div>
            </section>
          )}
          <footer className={styles.footer}>
            <span>
              Request <code>{detail.run.id}</code>
            </span>
            {detail.dataset && (
              <span>
                Dataset <code>{detail.dataset.name ?? detail.dataset.id}</code>
              </span>
            )}
            <button
              className={styles.textLink}
              style={{
                background: "none",
                border: 0,
                padding: 0,
                fontSize: "11px",
              }}
              onClick={download}
            >
              Download activity JSON ↓
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
