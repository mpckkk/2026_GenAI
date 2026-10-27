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
import {
  groupSteps,
  sponsorForStep,
  sponsors,
  stepStatus,
  timeOfDay,
  type Step,
} from "./activity-steps";
import { SponsorActivity } from "./sponsor-activity";
import { annotationOutcome, describeStep } from "./activity-copy";
import styles from "./activity.module.css";

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
      {fact("Provider", data.provider)}
      {fact("Provider job", data.providerJobId)}
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
              "Request ID",
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
            {fact("Interpretations", data.outputCounts.attempts)}
            {fact("Nuclei measured", data.outputCounts.nuclei)}
            {fact("Genes measured", data.outputCounts.genes)}
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

function StepEvidence({
  step,
  detail,
}: {
  step: Step;
  detail: ActivityRunDetail;
}) {
  const result = detail.results.find((item) => item.id === step.data.resultId);
  const memories = detail.memory.filter((item) =>
    step.data.sourceIds?.includes(item.source),
  );
  return (
    <div className={styles.plainEvidence}>
      <dl className={styles.dataList}>
        {fact(
          "Data used",
          step.data.datasetId
            ? detail.dataset?.id === step.data.datasetId
              ? (detail.dataset.name ?? "Attached experiment dataset")
              : "Dataset recorded in technical details"
            : undefined,
        )}
        {fact("Cell group", step.data.cluster)}
        {step.data.genes?.length
          ? fact("Genes compared", step.data.genes.join(", "))
          : null}
        {fact(
          "Source service",
          step.data.reference?.provider ?? step.data.provider,
        )}
        {fact("Reference entries returned", step.data.reference?.recordCount)}
        {step.data.reference?.recordCount !== undefined &&
          fact(
            "What an entry means",
            "A published link between a gene and a possible cell type.",
          )}
        {step.data.reference?.retrievedAt &&
          fact("Source retrieved", dateLabel(step.data.reference.retrievedAt))}
        {result &&
          fact(
            "Result",
            <Link href={result.href}>Open {result.title.toLowerCase()} ↗</Link>,
          )}
      </dl>
      {memories.length > 0 && (
        <ul className={styles.memoryList}>
          {memories.map((item) => (
            <li key={item.source}>
              <MemoryContent content={item.content} />
              <Link href={item.href}>Open original decision ↗</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestOutcome({
  detail,
  steps,
}: {
  detail: ActivityRunDetail;
  steps: Step[];
}) {
  if (detail.run.status !== "completed") return null;
  const analysis = steps.findLast(
    (step) =>
      step.first.kind === "tool" &&
      step.data.operation === "annotation" &&
      stepStatus(step, detail.run) === "completed" &&
      detail.results.some((result) => result.id === step.data.resultId),
  );
  const annotation = analysis ? annotationOutcome(analysis.data) : null;
  const result = analysis
    ? detail.results.find((item) => item.id === analysis.data.resultId)
    : null;
  const memory = steps.findLast(
    (step) =>
      step.first.kind === "memory" &&
      stepStatus(step, detail.run) === "completed",
  );
  const count = memory?.data.memoryCount;
  const onlyRecall =
    detail.run.toolCount === 0 && count !== undefined && count > 0;
  return (
    <section className={styles.requestOutcome} aria-label="Request outcome">
      <div>
        <p className={styles.eyebrow}>The outcome</p>
        <h2>
          {annotation?.title ??
            (onlyRecall
              ? `Found ${count} earlier ${count === 1 ? "decision" : "decisions"}`
              : "Your answer is ready")}
        </h2>
        <p>
          {annotation?.summary ??
            (onlyRecall
              ? "The agent received the earlier decision with a link back to the original review."
              : "Follow the steps below to see what information and actions led to this answer.")}
        </p>
      </div>
      {result ? (
        <Link className={styles.textLink} href={result.href}>
          Open the cell-type suggestions →
        </Link>
      ) : detail.response ? (
        <Link className={styles.textLink} href={detail.response.href}>
          Read the answer →
        </Link>
      ) : null}
    </section>
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
  const copy = describeStep(step, detail);
  const sponsor = sponsorForStep(step);
  const duration = step.last.durationMs ?? step.data.durationMs;
  const hasDetails =
    Object.keys(step.data).length > 0 || step.events.length > 1;
  return (
    <li
      className={styles.step}
      id={`activity-step-${step.id}`}
      tabIndex={-1}
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
        <div className={styles.stepTitle}>
          <h3>{copy.title}</h3>
          {sponsor && (
            <span className={styles.sponsorTag} data-sponsor={sponsor}>
              {sponsors[sponsor].name}
            </span>
          )}
        </div>
        <div className={styles.stepTiming}>
          <Status status={status} />
          {duration !== undefined && (
            <time
              dateTime={step.first.createdAt}
              title={`Started ${timeOfDay(step.first.createdAt)}`}
            >
              {durationLabel(duration)}
            </time>
          )}
        </div>
      </div>
      <p className={styles.stepOutcome}>{copy.outcome}</p>
      {!hasDetails && copy.purpose && (
        <p className={styles.stepSummary}>{copy.purpose}</p>
      )}
      {hasDetails && (
        <details className={styles.stepDetails}>
          <summary>Details</summary>
          <div className={styles.detailBody}>
            {copy.purpose && (
              <p className={styles.stepSummary}>{copy.purpose}</p>
            )}
            <StepEvidence step={step} detail={detail} />
            <details className={styles.technicalDetails}>
              <summary>Technical details</summary>
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
            </details>
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
            What Celloras did to answer this question, with the results and
            sources behind each step.
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
            {detail.dataset && (
              <div className={styles.inputData}>
                <WorkspaceIcon name="flask" size={13} />
                <span>
                  Data for this request:{" "}
                  {detail.dataset.name ?? "Attached experiment dataset"}
                </span>
              </div>
            )}
          </section>
          <dl className={styles.runFacts}>
            <div>
              <dt>Status</dt>
              <dd>
                <Status status={detail.run.status} />
              </dd>
            </div>
            <div>
              <dt>{active ? "Time so far" : "Time taken"}</dt>
              <dd>
                {active && detail.run.startedAt
                  ? durationLabel(observedAt - Date.parse(detail.run.startedAt))
                  : durationLabel(detail.run.durationMs)}
              </dd>
            </div>
            <div>
              <dt>Analyses run</dt>
              <dd>
                {detail.run.recordingVersion === null
                  ? "Not recorded"
                  : detail.run.toolCount}
              </dd>
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
          <RequestOutcome detail={detail} steps={grouped.all} />
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
          {detail.run.recordingVersion !== null && (
            <SponsorActivity steps={grouped.all} detail={detail} />
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
                <h2 id="results-heading">Results</h2>
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
                <h2 id="memory-heading">Earlier decisions found</h2>
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
            <details className={styles.technicalDetails}>
              <summary>Technical details of this request</summary>
              <dl className={styles.dataList}>
                {fact("Request ID", <code>{detail.run.id}</code>)}
                {fact("Runtime", detail.run.runtime ?? "Not reported")}
                {fact("Model", detail.run.model ?? "Not reported")}
                {fact("Error code", detail.run.errorCode)}
                {fact("Dataset version", detail.dataset?.artifactVersion)}
              </dl>
            </details>
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
