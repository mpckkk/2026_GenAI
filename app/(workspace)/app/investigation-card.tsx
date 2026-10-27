"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InvestigationRun, AnalysisRun } from "@/app/core/analysis";
import type { InvestigationResult } from "@/app/core/investigation";
import type {
  AnnotationCluster,
  AnnotationReview,
} from "@/app/core/annotation";
import type { GuidedAction } from "./next-actions";
import { AnnotationReviewPanel } from "./annotation-card";
import { ResultHeader } from "./result-card";
import styles from "./investigation-card.module.css";

export function InvestigationCard({
  run,
  onRun,
  onAsk,
  actionsDisabled,
}: {
  run: InvestigationRun;
  onRun: (action: GuidedAction) => void;
  onAsk: (question: string) => void;
  actionsDisabled: boolean;
}) {
  const [loaded, setLoaded] = useState<{
    result: InvestigationResult;
    group: AnnotationCluster;
    reviews: AnnotationReview[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/projects/${run.projectId}/analyses/${run.id}`,
          { cache: "no-store", signal: controller.signal },
        );
        const body = (await response.json()) as AnalysisRun;
        if (
          !response.ok ||
          body.id !== run.id ||
          !("operation" in body.result) ||
          body.result.operation !== "investigation" ||
          !("payload" in body.result)
        )
          throw new Error("The saved investigation could not be loaded.");
        const result = body.result;
        const original = await fetch(
          `/api/projects/${run.projectId}/analyses/${result.summary.sourceRunId}`,
          { cache: "no-store", signal: controller.signal },
        );
        const source = (await original.json()) as AnalysisRun & {
          annotationReviews: AnnotationReview[];
        };
        if (
          !original.ok ||
          !("operation" in source.result) ||
          source.result.operation !== "annotation" ||
          !("payload" in source.result)
        )
          throw new Error("The original annotation could not be loaded.");
        const group = source.result.payload.clusters.find(
          (c) => c.cluster === result.summary.cluster,
        );
        if (!group)
          throw new Error("The original cell group could not be loaded.");
        if (!controller.signal.aborted) {
          setLoaded({ result, group, reviews: source.annotationReviews });
          setError(null);
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load the investigation.",
          );
      }
    })();
    return () => controller.abort();
  }, [run.id, run.projectId, reload]);

  if (!loaded)
    return (
      <section className={styles.card} aria-label="Cell group investigation">
        <ResultHeader icon="search" title="Cell group investigation" />
        <div className={styles.body}>
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button onClick={() => setReload((n) => n + 1)}>
                Retry loading
              </button>
            </>
          ) : (
            <p role="status">Loading the saved evidence review…</p>
          )}
        </div>
      </section>
    );
  const { result, group, reviews } = loaded;
  const { packet, attempts, selectedAttempt } = result.payload;
  const attempt = attempts.find(
    (a) => a.sequence === (view ?? selectedAttempt ?? attempts[0].sequence),
  )!;
  const chosen = attempt.assessment;
  const segments = [
    {
      label: `${packet.candidates[0].cellType} markers only`,
      value: packet.check.firstOnly,
      color: "#397658",
    },
    { label: "Both marker sets", value: packet.check.both, color: "#c2a66d" },
    {
      label: `${packet.candidates[1].cellType} markers only`,
      value: packet.check.secondOnly,
      color: "#657ea6",
    },
    {
      label: "Neither selected set",
      value: packet.check.neither,
      color: "#e5e9e6",
    },
  ];
  const next = chosen.nextCheck;
  function nextAction() {
    if (next.kind === "external_validation") return;
    onRun({
      label:
        next.kind === "expression"
          ? "Show the gene on the cell map"
          : "Search the available papers",
      prompt: `Saved annotation run: ${packet.sourceRunId}\nFollow up on the investigation of group ${packet.cluster}: ${next.reason}`,
      action:
        next.kind === "expression"
          ? {
              operation: "expression",
              datasetId: packet.datasetId,
              genes: next.genes,
            }
          : {
              operation: "literature",
              datasetId: packet.datasetId,
              query: `${packet.tissue} ${packet.candidates.map((c) => c.cellType).join(" ")}`,
            },
    });
  }
  return (
    <section
      className={styles.card}
      aria-label="Cell group investigation"
      data-response-card="investigation_result"
      data-analysis-id={run.id}
    >
      <ResultHeader
        icon="search"
        title={`Group ${packet.cluster} · Evidence review`}
        detail={`${packet.nCells.toLocaleString()} nuclei`}
      />
      <div className={styles.body}>
        <p className={styles.eyebrow}>Previously {packet.before.status}</p>
        <h3>
          {result.summary.recommendation
            ? `Review suggests ${result.summary.recommendation}`
            : "The identity remains open"}
        </h3>
        <p className={styles.lead}>{result.summary.finding}</p>
        <p className={styles.note}>
          {result.summary.disagreement
            ? "The interpretations disagree. Compare their evidence below."
            : result.summary.recommendation
              ? "The interpretations agree on a recommendation. Agreement is not biological validation."
              : "The interpretations leave the identity unresolved."}{" "}
          The original annotation is unchanged.
        </p>

        <div className={styles.measurement}>
          <div className={styles.sectionTitle}>
            <h4>Do the marker signals occur together?</h4>
            <span>Measured in your data</span>
          </div>
          <div
            className={styles.bar}
            role="img"
            aria-label={segments
              .map((s) => `${s.label}: ${s.value} nuclei`)
              .join("; ")}
          >
            {segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <span
                  key={s.label}
                  style={{ flex: s.value, background: s.color }}
                />
              ))}
          </div>
          <div className={styles.legend}>
            {segments.map((s) => (
              <div key={s.label}>
                <i style={{ background: s.color }} />
                <span>{s.label}</span>
                <strong>{s.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <p className={styles.note}>
            A signal means at least one selected marker was detected. Low
            detection can hide transcripts. These counts do not establish cell
            identity or identify doublets.
          </p>
          <div className={styles.geneSets}>
            {packet.candidates.map((c) => (
              <div key={c.id}>
                <span>{c.cellType}</span>
                {c.selectedGenes.map((g) => (
                  <button
                    key={g}
                    disabled={actionsDisabled}
                    onClick={() =>
                      onRun({
                        label: `Show ${g}`,
                        prompt: `Show measured ${g} expression for group ${packet.cluster}. Keep the cell-type identity provisional.`,
                        action: {
                          operation: "expression",
                          datasetId: packet.datasetId,
                          genes: [g],
                        },
                      })
                    }
                  >
                    {g} ↗
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sectionTitle}>
          <h4>Compare the interpretations</h4>
          <span>{attempts.length} recorded</span>
        </div>
        <div className={styles.tabs} aria-label="Choose an interpretation">
          {attempts.map((a) => (
            <button
              key={a.sequence}
              aria-pressed={a.sequence === attempt.sequence}
              onClick={() => setView(a.sequence)}
            >
              Review {a.sequence}
              {a.sequence === selectedAttempt ? " · selected" : ""}
            </button>
          ))}
        </div>
        <p className={styles.note}>
          Nightshift selects for explanation quality. The selected review does
          not validate a cell identity.
        </p>
        <div className={styles.comparison}>
          {chosen.comparisons.map((c) => (
            <article key={c.candidateId}>
              <span className={styles.assessment} data-state={c.assessment}>
                {c.assessment === "supported"
                  ? "Evidence supports"
                  : c.assessment === "mixed"
                    ? "Mixed evidence"
                    : "Insufficient evidence"}
              </span>
              <h4>
                {
                  packet.candidates.find((p) => p.id === c.candidateId)
                    ?.cellType
                }
              </h4>
              <p>{c.explanation}</p>
              <details>
                <summary>See the evidence</summary>
                {c.evidenceIds.map((id) => {
                  const e = packet.evidence.find((e) => e.id === id)!;
                  return (
                    <div className={styles.evidence} key={id}>
                      <strong>{e.label}</strong>
                      {e.kind === "marker" ? (
                        <>
                          <span>
                            {Math.round((e.detectionFraction ?? 0) * 100)}% of
                            this group detected ·{" "}
                            {e.assessment?.replaceAll("_", " ")}
                          </span>
                          <a
                            href={
                              e.sourceUrl?.startsWith("https://")
                                ? e.sourceUrl
                                : undefined
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Source rows {e.sourceRows?.join(", ")} ↗
                          </a>
                          <small>Source species: {e.sourceSpecies}</small>
                        </>
                      ) : (
                        <p>{e.details}</p>
                      )}
                    </div>
                  );
                })}
              </details>
            </article>
          ))}
        </div>
        <div className={styles.next}>
          <h4>What would help next?</h4>
          <p>{next.reason}</p>
          <span className={styles.note}>
            Suggested check, not yet performed.
          </span>
          {next.kind !== "external_validation" && (
            <button disabled={actionsDisabled} onClick={nextAction}>
              {next.kind === "expression"
                ? "Open the gene map"
                : "Search the available papers"}{" "}
              ↗
            </button>
          )}
        </div>
        <details className={styles.limits}>
          <summary>Limits and recorded execution</summary>
          <ul>
            {[...result.warnings, ...chosen.limitations].map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
          <p>
            Compared by Meterless Nightshift · job{" "}
            <code>{result.payload.receipt.jobId}</code>
          </p>
          <p>
            {attempt.model
              ? `Reported model: ${attempt.model}`
              : "This attempt did not report a model identifier."}
          </p>
          <p>
            Reference:{" "}
            <a
              href={result.payload.reference.url}
              target="_blank"
              rel="noreferrer"
            >
              {result.payload.reference.title} ↗
            </a>
            {result.payload.referenceDelivery
              ? ` · retrieved through ${result.payload.referenceDelivery.provider}`
              : ""}
          </p>
        </details>
        <Link className={styles.activity} href={`/app/activity/${run.turnId}`}>
          See every step of this investigation ↗
        </Link>
      </div>
      <AnnotationReviewPanel
        projectId={run.projectId}
        runId={packet.sourceRunId}
        cluster={group}
        initialReviews={reviews}
        investigationRunId={run.id}
        actionsDisabled={actionsDisabled}
        onAsk={() =>
          onAsk(
            `Saved annotation run: ${packet.sourceRunId}\nWhat is my latest saved decision for group ${packet.cluster}, why did I make it, and which investigation informed it? Cite the saved review.`,
          )
        }
      />
    </section>
  );
}
