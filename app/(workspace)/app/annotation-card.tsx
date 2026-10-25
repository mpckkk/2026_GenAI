"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { AnalysisRun, AnnotationRun } from "@/app/core/analysis";
import type {
  AnnotationCandidate,
  AnnotationCluster,
  AnnotationGeneEvidence,
  AnnotationResult,
  AnnotationReview,
} from "@/app/core/annotation";
import type { GuidedAction } from "./next-actions";
import type { ScientificSelection } from "./scientific-card";
import styles from "./annotation-card.module.css";

const counts = new Intl.NumberFormat("en-GB");
const statusLabels = {
  suggested: "Suggested",
  ambiguous: "Ambiguous",
  unresolved: "Unresolved",
};
const decisionLabels = {
  accepted: "Candidate accepted",
  corrected: "Researcher label",
  unresolved: "Kept unresolved",
  rejected: "Candidates rejected",
};
const numeric = (value: number) =>
  value.toLocaleString("en-GB", { maximumSignificantDigits: 5 });
const detected = (value: number) => `${numeric(value * 100)}%`;
const timestamp = (value: string) =>
  `${new Date(value).toLocaleString("en-GB", { timeZone: "UTC" })} UTC`;

function sourceLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function AnnotationCard({
  run,
  onRun,
  onAsk,
  selection,
  onSelect,
  actionsDisabled,
}: {
  run: AnnotationRun;
  onRun: (action: GuidedAction) => void;
  onAsk: (question: string) => void;
  selection: ScientificSelection | null;
  onSelect: (selection: ScientificSelection) => void;
  actionsDisabled: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState<{
    result: AnnotationResult;
    reviews: AnnotationReview[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
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
            const body = (await response.json()) as AnalysisRun & {
              annotationReviews?: AnnotationReview[];
              error?: string;
            };
            if (!response.ok)
              throw new Error(
                body.error || "The saved annotation could not be loaded.",
              );
            if (
              body.id !== run.id ||
              body.projectId !== run.projectId ||
              !("operation" in body.result) ||
              body.result.operation !== "annotation" ||
              !("payload" in body.result) ||
              !Array.isArray(body.result.payload.clusters) ||
              !Array.isArray(body.annotationReviews)
            )
              throw new Error(
                "The saved annotation is incomplete. Please retry loading it.",
              );
            if (!controller.signal.aborted) {
              setLoaded({
                result: body.result,
                reviews: body.annotationReviews,
              });
              setError(null);
            }
          } catch (failure) {
            if (!controller.signal.aborted)
              setError(
                failure instanceof Error
                  ? failure.message
                  : "The saved annotation could not be loaded.",
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

  return (
    <section
      ref={container}
      className={styles.card}
      aria-label="Cell-type annotation card"
      data-response-card="annotation_result"
      data-analysis-id={run.id}
    >
      <header className={styles.header}>
        <strong>Cell-type suggestions</strong>
        <span>Reference evidence · Researcher review</span>
      </header>
      {loaded ? (
        <AnnotationContent
          key={run.id}
          run={run}
          result={loaded.result}
          reviews={loaded.reviews}
          onRun={onRun}
          onAsk={onAsk}
          selection={selection}
          onSelect={onSelect}
          actionsDisabled={actionsDisabled}
        />
      ) : error ? (
        <div className={styles.body}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry loading annotation
          </button>
        </div>
      ) : (
        <p className={styles.loading} role="status">
          Loading saved candidates and evidence…
        </p>
      )}
    </section>
  );
}

function AnnotationContent({
  run,
  result,
  reviews,
  onRun,
  onAsk,
  selection,
  onSelect,
  actionsDisabled,
}: {
  run: AnnotationRun;
  result: AnnotationResult;
  reviews: AnnotationReview[];
  onRun: (action: GuidedAction) => void;
  onAsk: (question: string) => void;
  selection: ScientificSelection | null;
  onSelect: (selection: ScientificSelection) => void;
  actionsDisabled: boolean;
}) {
  const [localSelected, setLocalSelected] = useState(
    result.payload.clusters[0]?.cluster ?? "",
  );
  const selected =
    selection?.datasetId === result.dataset.id &&
    result.payload.clusters.some((item) => item.cluster === selection.cluster)
      ? selection.cluster!
      : localSelected;
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set(),
  );
  const cluster = result.payload.clusters.find(
    (item) => item.cluster === selected,
  );
  const reference = result.payload.reference;
  const allCandidates = expandedClusters.has(selected);
  const candidateListId = useId();

  function selectContext(clusterId = selected) {
    setLocalSelected(clusterId);
    onSelect({ datasetId: result.dataset.id, cluster: clusterId });
  }

  function showExpression(geneId: string) {
    selectContext();
    onRun({
      label: `Show ${geneId} expression`,
      prompt: `Show ${geneId} expression for ${result.dataset.title}. Explain whether its expression supports the candidate cell types for source cluster ${selected}, including expression elsewhere.`,
      action: {
        operation: "expression",
        datasetId: result.dataset.id,
        genes: [geneId],
      },
    });
  }

  function compareCandidate(candidate: AnnotationCandidate) {
    selectContext();
    const genes = Array.from(
      new Set(
        [
          ...candidate.supportingGenes,
          ...candidate.conflictingGenes,
          ...candidate.uninformativeGenes,
        ].map((gene) => gene.geneId),
      ),
    ).slice(0, 12);
    onRun({
      label: `Compare ${candidate.cellType} markers`,
      prompt: `Compare these ${genes.length} reference marker genes for the ${candidate.cellType} candidate in source cluster ${selected} across all source clusters of ${result.dataset.title}. Explain supporting, conflicting and weak evidence without treating this candidate as a validated identity.`,
      action: {
        operation: "dotplot",
        datasetId: result.dataset.id,
        genes,
      },
    });
  }

  return (
    <>
      <div className={styles.body}>
        <h3>Review the cell-type evidence</h3>
        <p className={styles.caption}>
          {result.dataset.species} · {result.dataset.tissue} ·{" "}
          {result.dataset.genomeBuild}
        </p>
        <div className={styles.counts} aria-label="Annotation status overview">
          <span>
            <strong>{result.summary.suggestedCount}</strong> suggested
          </span>
          <span>
            <strong>{result.summary.ambiguousCount}</strong> ambiguous
          </span>
          <span>
            <strong>{result.summary.unresolvedCount}</strong> unresolved
          </span>
        </div>
        <p className={styles.caption}>
          Select a source cluster to compare candidates and record your
          decision. Scores describe marker evidence; they are not probabilities
          or validated confidence.
        </p>
        <div className={styles.clusters} aria-label="Select annotation cluster">
          {result.payload.clusters.map((item) => (
            <button
              key={item.cluster}
              type="button"
              aria-pressed={item.cluster === selected}
              onClick={() => selectContext(item.cluster)}
            >
              <strong>Cluster {item.cluster}</strong>
              <span data-status={item.status}>{statusLabels[item.status]}</span>
              <small>{counts.format(item.nCells)} nuclei</small>
            </button>
          ))}
        </div>
        {cluster ? (
          <>
            <div className={styles.clusterHeading}>
              <div>
                <h4>Cluster {cluster.cluster}</h4>
                <p className={styles.caption}>
                  {counts.format(cluster.nCells)} nuclei
                  {cluster.suggestedLabel
                    ? ` · Suggested: ${cluster.suggestedLabel}`
                    : " · No single label assigned"}
                </p>
              </div>
              <span className={styles.status} data-status={cluster.status}>
                {statusLabels[cluster.status]}
              </span>
            </div>
            <p className={styles.reason}>{cluster.reason}</p>
            <div className={styles.candidates} id={candidateListId}>
              {cluster.candidates
                .slice(0, allCandidates ? undefined : 3)
                .map((candidate, index) => (
                  <Candidate
                    key={`${cluster.cluster}:${candidate.cellType}`}
                    candidate={candidate}
                    rank={index + 1}
                    onExpression={showExpression}
                    onCompare={() => compareCandidate(candidate)}
                    actionsDisabled={actionsDisabled}
                  />
                ))}
              {!cluster.candidates.length && (
                <p className={styles.caption}>
                  No candidate evidence was returned for this cluster. You can
                  keep it unresolved and record what needs checking.
                </p>
              )}
            </div>
            <div className={styles.actions}>
              {cluster.candidates.length > 3 && (
                <button
                  type="button"
                  className={styles.button}
                  aria-expanded={allCandidates}
                  aria-controls={candidateListId}
                  onClick={() =>
                    setExpandedClusters((current) => {
                      const next = new Set(current);
                      if (next.has(selected)) next.delete(selected);
                      else next.add(selected);
                      return next;
                    })
                  }
                >
                  {allCandidates
                    ? "Show top 3 candidates"
                    : `Compare all ${cluster.candidates.length} candidates`}
                </button>
              )}
              <button
                type="button"
                className={styles.button}
                disabled={actionsDisabled}
                onClick={() => {
                  selectContext();
                  onAsk(
                    `Saved annotation run: ${run.id}\nExplain this saved annotation for source cluster ${cluster.cluster} in ${result.dataset.title}. Compare the candidate cell types, supporting and conflicting genes, reference provenance and remaining uncertainty. Distinguish the computed suggestions from my saved decisions.`,
                  );
                }}
              >
                Draft a question about this decision
              </button>
            </div>
          </>
        ) : (
          <p className={styles.caption}>
            This result contains no clusters to review.
          </p>
        )}
      </div>
      <details className={styles.methods}>
        <summary>Reference, method and validation</summary>
        {result.payload.referenceDelivery && (
          <p>
            Marker reference retrieved through{" "}
            {result.payload.referenceDelivery.provider}; all{" "}
            {result.payload.referenceDelivery.recordCount} associations verified
            against the published reference version.
          </p>
        )}
        <p>
          <strong>{result.method.label}.</strong> {result.method.description}
        </p>
        <p className={styles.validation}>
          <strong>Not independently validated.</strong>{" "}
          {result.payload.validation.description}
        </p>
        <dl>
          <dt>Reference</dt>
          <dd>
            <a
              href={sourceLink(reference.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {reference.title} ↗
            </a>
          </dd>
          <dt>Coverage</dt>
          <dd>{reference.coverage}</dd>
          <dt>Reference scope</dt>
          <dd>
            {reference.speciesId} · {reference.tissue} · {reference.genomeBuild}{" "}
            · {reference.markerGeneCount} marker genes ·{" "}
            {reference.cellTypeCount} cell types
          </dd>
          <dt>Assay / layer</dt>
          <dd>
            {result.method.assay} / {result.method.layer}
          </dd>
          <dt>Parameters</dt>
          <dd>
            {Object.entries(result.method.parameters)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" · ")}
          </dd>
          <dt>Reference version / SHA-256</dt>
          <dd>
            <code>{reference.version}</code>
            <br />
            <code>{reference.sha256}</code>
          </dd>
          <dt>Dataset version</dt>
          <dd>
            <code>{result.dataset.artifactVersion}</code>
          </dd>
        </dl>
        {result.warnings.length > 0 && (
          <ul>
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <p>
          Computed {timestamp(result.generatedAt)}. Saved evidence is immutable.
        </p>
      </details>
      {cluster && (
        <AnnotationReviewPanel
          projectId={run.projectId}
          runId={run.id}
          cluster={cluster}
          initialReviews={reviews}
          actionsDisabled={actionsDisabled}
          onAsk={() => {
            selectContext();
            onAsk(
              `Saved annotation run: ${run.id}\nWhat is my latest saved decision for group ${cluster.cluster}, and why? Recall my researcher review and cite its saved source. Explain any correction while keeping my decision separate from the computed cell-type suggestion.`,
            );
          }}
        />
      )}
    </>
  );
}

function Candidate({
  candidate,
  rank,
  onExpression,
  onCompare,
  actionsDisabled,
}: {
  candidate: AnnotationCandidate;
  rank: number;
  onExpression: (gene: string) => void;
  onCompare: () => void;
  actionsDisabled: boolean;
}) {
  const availableEvidence =
    candidate.supportingGenes.length +
    candidate.conflictingGenes.length +
    candidate.uninformativeGenes.length;
  return (
    <details className={styles.candidate}>
      <summary>
        <span className={styles.candidateTitle}>
          <span className={styles.rank}>{rank}</span>
          <strong>{candidate.cellType}</strong>
        </span>
        <span className={styles.score}>
          Score{" "}
          <strong title={String(candidate.score)}>
            {numeric(candidate.score)}
          </strong>
        </span>
        <span className={styles.evidenceCounts}>
          {candidate.supportingGenes.length} supporting ·{" "}
          {candidate.conflictingGenes.length} conflicting ·{" "}
          {candidate.uninformativeGenes.length} weak
        </span>
      </summary>
      <div className={styles.candidateBody}>
        <p className={styles.reason}>{candidate.reason}</p>
        <p className={styles.caption}>
          {candidate.availableGeneCount} of {candidate.referenceGeneCount}{" "}
          reference genes are present in the dataset. The score is descriptive,
          not a probability of cell identity.
        </p>
        <EvidenceTable
          title="Supporting genes"
          genes={candidate.supportingGenes}
          onExpression={onExpression}
          actionsDisabled={actionsDisabled}
        />
        <EvidenceTable
          title="Conflicting genes"
          genes={candidate.conflictingGenes}
          onExpression={onExpression}
          actionsDisabled={actionsDisabled}
        />
        <EvidenceTable
          title="Weak or uninformative genes"
          genes={candidate.uninformativeGenes}
          onExpression={onExpression}
          actionsDisabled={actionsDisabled}
        />
        {candidate.missingGenes.length > 0 && (
          <details className={styles.missing}>
            <summary>
              {candidate.missingGenes.length} reference genes absent from this
              dataset
            </summary>
            <p>{candidate.missingGenes.join(", ")}</p>
            <p>
              An unavailable feature is not evidence that the cell type is
              absent.
            </p>
          </details>
        )}
        {availableEvidence > 0 && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={actionsDisabled}
              onClick={onCompare}
            >
              Compare {Math.min(12, availableEvidence)} marker genes across
              clusters →
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

function EvidenceTable({
  title,
  genes,
  onExpression,
  actionsDisabled,
}: {
  title: string;
  genes: AnnotationGeneEvidence[];
  onExpression: (gene: string) => void;
  actionsDisabled: boolean;
}) {
  if (!genes.length)
    return <p className={styles.caption}>{title}: none returned.</p>;
  return (
    <details className={styles.evidence}>
      <summary>
        {title} ({genes.length})
      </summary>
      <p className={styles.caption}>
        Detection is the observed fraction of nuclei with expression. Scroll
        sideways for all measurements; gene details include the saved exact
        values and source.
      </p>
      <div
        className={styles.tableWrap}
        tabIndex={0}
        role="region"
        aria-label={`${title}; scroll for all genes and measurements`}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Gene / source</th>
              <th scope="col">Detected in cluster</th>
              <th scope="col">Detected elsewhere</th>
              <th scope="col">Mean in cluster</th>
              <th scope="col">Mean elsewhere</th>
              <th scope="col">Enrichment</th>
              <th scope="col">Z score</th>
            </tr>
          </thead>
          <tbody>
            {genes.map((gene) => (
              <tr key={gene.geneId}>
                <th scope="row">
                  <button
                    type="button"
                    className={styles.geneButton}
                    disabled={actionsDisabled}
                    onClick={() => onExpression(gene.geneId)}
                  >
                    {gene.geneId} ↗
                  </button>
                  <details className={styles.geneDetails}>
                    <summary>Exact values & source</summary>
                    <dl>
                      <dt>Source gene / marker</dt>
                      <dd>
                        {gene.sourceGeneId} / {gene.markerName}
                      </dd>
                      <dt>Reference origin</dt>
                      <dd>
                        {gene.sourceSpecies}
                        {gene.orthologyType ? ` · ${gene.orthologyType}` : ""}
                      </dd>
                      <dt>Detection fractions: cluster / rest</dt>
                      <dd>
                        {gene.detectionFraction} / {gene.otherDetectionFraction}
                      </dd>
                      <dt>Mean log expression: cluster / rest</dt>
                      <dd>
                        {gene.meanLogExpression} / {gene.otherMeanLogExpression}
                      </dd>
                      <dt>Enrichment / Z score</dt>
                      <dd>
                        {gene.enrichment} / {gene.zScore}
                      </dd>
                      <dt>Source rows</dt>
                      <dd>{gene.sourceRows.join(", ")}</dd>
                    </dl>
                    <a
                      href={sourceLink(gene.sourceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open marker source ↗
                    </a>
                    {gene.originalReferences.length > 0 && (
                      <p>
                        Original references:{" "}
                        {gene.originalReferences.join("; ")}
                      </p>
                    )}
                  </details>
                </th>
                <td title={String(gene.detectionFraction)}>
                  {detected(gene.detectionFraction)}
                </td>
                <td title={String(gene.otherDetectionFraction)}>
                  {detected(gene.otherDetectionFraction)}
                </td>
                <td title={String(gene.meanLogExpression)}>
                  {numeric(gene.meanLogExpression)}
                </td>
                <td title={String(gene.otherMeanLogExpression)}>
                  {numeric(gene.otherMeanLogExpression)}
                </td>
                <td title={String(gene.enrichment)}>
                  {numeric(gene.enrichment)}
                </td>
                <td title={String(gene.zScore)}>{numeric(gene.zScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

interface ReviewDraft {
  decision: AnnotationReview["decision"];
  cellType: string;
  note: string;
}
const emptyDraft: ReviewDraft = {
  decision: "unresolved",
  cellType: "",
  note: "",
};

function AnnotationReviewPanel({
  projectId,
  runId,
  cluster,
  initialReviews,
  onAsk,
  actionsDisabled,
}: {
  projectId: string;
  runId: string;
  cluster: AnnotationCluster;
  initialReviews: AnnotationReview[];
  onAsk: () => void;
  actionsDisabled: boolean;
}) {
  const id = useId();
  const submissionIds = useRef(new Map<string, string>());
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [reviews, setReviews] = useState(initialReviews);
  const [pendingCluster, setPendingCluster] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [conflicts, setConflicts] = useState<Record<string, boolean>>({});
  const [savedCluster, setSavedCluster] = useState<string | null>(null);
  const draft = drafts[cluster.cluster] ?? emptyDraft;
  const pending = pendingCluster !== null;
  const error = errors[cluster.cluster];
  const conflict = conflicts[cluster.cluster];
  const clusterReviews = reviews
    .filter((review) => review.cluster === cluster.cluster)
    .slice(0, 5);
  const latest = clusterReviews[0];
  const candidateLabel = cluster.candidates.some(
    (candidate) => candidate.cellType === draft.cellType,
  );
  const validLabel =
    draft.decision === "accepted"
      ? candidateLabel
      : draft.decision === "corrected"
        ? Boolean(draft.cellType.trim())
        : true;

  function edit(change: Partial<ReviewDraft>) {
    setDrafts((current) => ({
      ...current,
      [cluster.cluster]: {
        ...(current[cluster.cluster] ?? emptyDraft),
        ...change,
      },
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !draft.note.trim() || !validLabel) return;
    const asNew =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("name") ===
      "saveAsNew";
    if (asNew && !conflict) return;
    const targetCluster = cluster.cluster;
    if (!submissionIds.current.has(targetCluster) || asNew)
      submissionIds.current.set(targetCluster, crypto.randomUUID());
    setPendingCluster(targetCluster);
    setErrors((current) => ({ ...current, [targetCluster]: null }));
    try {
      const response = await fetch(
        `/api/projects/${projectId}/analyses/${runId}/annotation-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId: submissionIds.current.get(targetCluster),
            cluster: targetCluster,
            decision: draft.decision,
            cellType: ["accepted", "corrected"].includes(draft.decision)
              ? draft.cellType.trim()
              : null,
            note: draft.note,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setConflicts((current) => ({
          ...current,
          [targetCluster]: response.status === 409,
        }));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Your decision could not be saved. Please retry.",
        );
      }
      const review = body.review as AnnotationReview | undefined;
      if (
        !review?.id ||
        review.runId !== runId ||
        review.cluster !== targetCluster
      )
        throw new Error(
          "The save could not be confirmed. Retry to check the same submission.",
        );
      setReviews((current) => [
        review,
        ...current.filter((item) => item.id !== review.id),
      ]);
      submissionIds.current.delete(targetCluster);
      setConflicts((current) => ({ ...current, [targetCluster]: false }));
      setDrafts((current) => ({ ...current, [targetCluster]: emptyDraft }));
      setSavedCluster(targetCluster);
    } catch (failure) {
      setErrors((current) => ({
        ...current,
        [targetCluster]:
          failure instanceof Error
            ? failure.message
            : "The save could not be confirmed. Retry to check the same submission.",
      }));
    } finally {
      setPendingCluster(null);
    }
  }

  return (
    <div className={styles.review}>
      <h4>Your decision · Cluster {cluster.cluster}</h4>
      <p className={styles.caption}>
        Your label and reasoning are saved separately from the computed
        candidates. Up to five recent decisions are shown for this cluster;
        older decisions and evidence remain stored.
      </p>
      {latest && (
        <div
          className={styles.saved}
          role={savedCluster === cluster.cluster ? "status" : undefined}
        >
          <strong>Saved annotation decision</strong>
          <p>
            {decisionLabels[latest.decision]}
            {latest.cellType ? ` · ${latest.cellType}` : ""}
          </p>
          <p>{latest.note}</p>
          <small>{timestamp(latest.createdAt)}</small>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={actionsDisabled || pending}
              onClick={onAsk}
            >
              Ask about my saved decision
            </button>
          </div>
        </div>
      )}
      {clusterReviews.length > 1 && (
        <details className={styles.history}>
          <summary>
            Recent decisions ({clusterReviews.length - 1} earlier)
          </summary>
          {clusterReviews.slice(1).map((review) => (
            <div key={review.id}>
              <strong>
                {decisionLabels[review.decision]}
                {review.cellType ? ` · ${review.cellType}` : ""}
              </strong>
              <p>{review.note}</p>
              <small>{timestamp(review.createdAt)}</small>
            </div>
          ))}
        </details>
      )}
      <details className={styles.reviewForm}>
        <summary>
          {latest ? "Add another decision" : "Review and save a decision"}
        </summary>
        <form
          onSubmit={(event) => void save(event)}
          aria-label={`Review annotation for cluster ${cluster.cluster}`}
        >
          <label htmlFor={`${id}-decision`}>What do you conclude?</label>
          <select
            id={`${id}-decision`}
            value={draft.decision}
            disabled={pending}
            onChange={(event) => {
              const decision = event.target
                .value as AnnotationReview["decision"];
              edit({
                decision,
                ...(decision === "accepted" && !candidateLabel
                  ? { cellType: cluster.candidates[0]?.cellType ?? "" }
                  : {}),
              });
            }}
          >
            <option value="unresolved">
              Keep unresolved — needs more evidence
            </option>
            <option value="accepted" disabled={!cluster.candidates.length}>
              Accept a reference candidate
            </option>
            <option value="corrected">Assign my own cell-type label</option>
            <option value="rejected">Reject these candidates</option>
          </select>
          {draft.decision === "accepted" && (
            <>
              <label htmlFor={`${id}-label`}>Candidate cell type</label>
              <select
                id={`${id}-label`}
                value={draft.cellType}
                required
                disabled={pending}
                onChange={(event) => edit({ cellType: event.target.value })}
              >
                <option value="" disabled>
                  Select a candidate
                </option>
                {cluster.candidates.map((candidate) => (
                  <option key={candidate.cellType} value={candidate.cellType}>
                    {candidate.cellType}
                  </option>
                ))}
              </select>
            </>
          )}
          {draft.decision === "corrected" && (
            <>
              <label htmlFor={`${id}-label`}>Your cell-type label</label>
              <input
                id={`${id}-label`}
                value={draft.cellType}
                required
                maxLength={200}
                disabled={pending}
                onChange={(event) => edit({ cellType: event.target.value })}
                placeholder="Enter your interpretation"
              />
              <p className={styles.caption}>
                This will be recorded as a researcher-assigned label.
              </p>
            </>
          )}
          <label htmlFor={`${id}-note`}>Evidence and reasoning</label>
          <textarea
            id={`${id}-note`}
            value={draft.note}
            required
            maxLength={4000}
            disabled={pending}
            onChange={(event) => edit({ note: event.target.value })}
            placeholder="Which markers support your decision? What conflicts or remains uncertain?"
          />
          {error && (
            <p className={styles.error} role="alert">
              {error} Your draft is retained.
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.button}
              data-primary="true"
              disabled={pending || !draft.note.trim() || !validLabel}
            >
              {pendingCluster === cluster.cluster
                ? "Saving decision…"
                : error && !conflict
                  ? "Retry the same save"
                  : "Save annotation decision"}
            </button>
            {conflict && (
              <button
                type="submit"
                name="saveAsNew"
                className={styles.button}
                disabled={pending || !draft.note.trim() || !validLabel}
              >
                Save as a new decision
              </button>
            )}
          </div>
        </form>
      </details>
    </div>
  );
}
