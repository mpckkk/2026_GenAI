"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisReview, LiteratureRun } from "@/app/core/analysis";
import { AnalysisReviewForm } from "./scientific-card";
import styles from "./scientific-card.module.css";

const kindLabels = {
  study_context: "Study context",
  method: "Method",
  marker_association: "Published marker association",
  limitation: "Limitation",
};

export function LiteratureCard({
  run,
  onAsk,
  actionsDisabled,
}: {
  run: LiteratureRun;
  onAsk: (question: string) => void;
  actionsDisabled: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const [reviews, setReviews] = useState<AnalysisReview[] | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void (async () => {
          try {
            const response = await fetch(
              `/api/projects/${run.projectId}/analyses/${run.id}`,
              { cache: "no-store", signal: controller.signal },
            );
            const body = await response.json();
            if (
              !response.ok ||
              body.id !== run.id ||
              !Array.isArray(body.reviews)
            )
              throw new Error(
                "Saved interpretations could not be loaded. Retry to view them.",
              );
            if (!controller.signal.aborted) {
              setReviews(body.reviews);
              setReviewError(null);
            }
          } catch (failure) {
            if (!controller.signal.aborted)
              setReviewError(
                failure instanceof Error
                  ? failure.message
                  : "Saved interpretations could not be loaded.",
              );
          }
        })();
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [run.id, run.projectId, attempt]);
  const result = run.result;
  return (
    <section
      ref={container}
      className={styles.card}
      data-response-card="literature_result"
      data-analysis-id={run.id}
      aria-label="Literature evidence card"
    >
      <header className={styles.header}>
        <strong>Published evidence</strong>
        <span>Curated source collection</span>
      </header>
      <div className={styles.body}>
        <h3>
          {result.results.length
            ? "Follow the evidence"
            : "No matching evidence in this collection"}
        </h3>
        <p className={styles.caption}>
          {result.results.length
            ? `${result.results.length} relevant ${result.results.length === 1 ? "passage" : "passages"}. Each has a source and a specific role in your interpretation.`
            : "This is a gap in the available collection, not proof that evidence does not exist."}
        </p>
        <p className={styles.caption}>
          A relevant paper does not automatically support a cell-type label.
          Check whether each passage applies to this dataset.
        </p>
        {result.results.length > 0 && (
          <ol className={styles.sources}>
            {result.results.map((hit) => (
              <li className={styles.source} key={hit.id}>
                <span className={styles.sourceTag}>
                  {kindLabels[hit.kind]} ·{" "}
                  {hit.compatibility.species === "exact"
                    ? "Same species"
                    : "General evidence"}
                  {hit.compatibility.genome === "exact"
                    ? " · Matching genome build"
                    : ""}
                </span>
                <h4>{hit.title}</h4>
                <p>{hit.summary}</p>
                <p>
                  <strong>Applicability:</strong> {hit.applicability}
                </p>
                <a href={hit.url} target="_blank" rel="noopener noreferrer">
                  Read source passage ↗
                </a>
                <p className={styles.caption}>
                  {hit.citation}
                  <br />
                  {hit.locator}
                </p>
                <details className={styles.caption}>
                  <summary>Source details</summary>
                  {hit.excerpt && <blockquote>{hit.excerpt}</blockquote>}
                  <p>{hit.source.title}</p>
                  <p>{hit.source.coverage}</p>
                  <p>
                    Evidence type: curated factual summary
                    {hit.excerpt ? " with source excerpt" : ""}. Source
                    retrieved {hit.source.retrievedAt}.
                  </p>
                  <p>License: {hit.source.license}</p>
                  {hit.genes.length > 0 && (
                    <p>Gene associations: {hit.genes.join(", ")}</p>
                  )}
                  <p>
                    Passage: <code>{hit.id}</code>
                    <br />
                    Evidence SHA-256: <code>{hit.evidenceSha256}</code>
                  </p>
                </details>
                <button
                  type="button"
                  className={styles.button}
                  disabled={actionsDisabled}
                  onClick={() =>
                    onAsk(
                      `Explain how the passage “${hit.title}” (${hit.id}) applies to this analysis, and what it cannot establish. Include the source and competing interpretations.`,
                    )
                  }
                >
                  Draft a question about this evidence
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <details className={styles.details}>
        <summary>Search scope and limitations</summary>
        <p>Query: {result.query}</p>
        <dl>
          <dt>Species / tissue / genome</dt>
          <dd>
            {result.filters.speciesId} / {result.filters.tissue} /{" "}
            {result.filters.genomeVersion}
          </dd>
          <dt>Method</dt>
          <dd>
            Keyword search of a curated, versioned collection. This is not a
            search of all published literature.
          </dd>
          <dt>Collection version</dt>
          <dd>
            <code>{result.corpusVersion}</code>
          </dd>
        </dl>
        {result.filters.genes.length > 0 && (
          <p>Requested genes: {result.filters.genes.join(", ")}</p>
        )}
        {result.excludedSources.length > 0 && (
          <>
            <p>Excluded incompatible references:</p>
            <ul>
              {result.excludedSources.map((source) => (
                <li key={source.sourceId}>
                  {source.sourceId}: {source.expectedGenomeVersion} does not
                  match {source.requestedGenomeVersion}.
                </li>
              ))}
            </ul>
          </>
        )}
        <ul>
          {result.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>
      {reviews ? (
        <AnalysisReviewForm
          projectId={run.projectId}
          runId={run.id}
          initialReviews={reviews}
        />
      ) : reviewError ? (
        <div className={styles.body}>
          <p className={styles.error} role="alert">
            {reviewError}
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry loading interpretations
          </button>
        </div>
      ) : (
        <p className={styles.loading} role="status">
          Loading your saved interpretations…
        </p>
      )}
    </section>
  );
}
