"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  MarkerEvidenceRun,
  EvidenceReviewReceipt,
} from "@/app/core/evidence";
import type { ResearchEntry } from "@/app/core/research";
import { appendResearch } from "./actions";
import { ResultHeader, CountBar } from "./result-card";
import { MarkerEvidenceView } from "./marker-evidence-view";
import styles from "./agent-response.module.css";

const statusLabels = {
  matches_found: "Published matches found",
  no_matches: "No matches in this reference",
  context_required: "Sample context needed",
  incompatible: "Reference not compatible",
};

export function EvidenceCard({
  result,
  review,
  onAsk,
  actionsDisabled,
}: {
  result: MarkerEvidenceRun;
  review?: EvidenceReviewReceipt;
  onAsk: (question: string) => void;
  actionsDisabled: boolean;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState<ResearchEntry | null>(null);
  const submissionId = useRef<string | null>(null);
  const receipt = saved?.kind === "evidence_review" ? saved : review;
  const queried = ["matches_found", "no_matches"].includes(result.status);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !selection) return;
    const asNew =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("name") ===
      "saveAsNew";
    if (asNew && !conflict) return;
    setPending(true);
    setError(null);
    try {
      if (!submissionId.current || asNew)
        submissionId.current = crypto.randomUUID();
      const state = await appendResearch(result.projectId, {
        submissionId: submissionId.current,
        command: {
          kind: "evidence_review",
          evidenceRunId: result.id,
          markerEntryId: result.marker.id,
          decision: selection.startsWith("candidate:")
            ? "candidate"
            : selection === "rejected"
              ? "rejected"
              : "unresolved",
          cellType: selection.startsWith("candidate:")
            ? selection.slice(10)
            : null,
          notes,
        },
      });
      if (state.status === "saved") {
        setSaved(state.entry);
        submissionId.current = null;
        setConflict(false);
        router.refresh();
      } else if (state.status === "error") {
        setError(
          [state.message, ...Object.values(state.fields || {})].join(" "),
        );
        setConflict(state.code === "SUBMISSION_CONFLICT");
      }
    } catch {
      setError(
        "The save could not be confirmed. Your decision and notes are still here; retry to check the same save.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className={styles.card}
      aria-label="Marker evidence card"
      data-response-card="marker_evidence"
      data-evidence-id={result.id}
    >
      <ResultHeader
        icon="leaf"
        title="Marker evidence"
        detail="Published reference"
      />
      <div className={styles.body}>
        <p className={styles.eyebrow}>
          {result.marker.label || "Saved markers"} <span>·</span>{" "}
          {result.marker.context?.tissue || "Tissue not specified"}
        </p>
        <div className={styles.resultHero}>
          <div>
            <p className={styles.resultLabel}>
              {result.status === "matches_found"
                ? "Candidate cell type"
                : "Reference lookup"}
            </p>
            <h3 className={styles.resultTitle}>
              {result.status === "matches_found"
                ? result.candidates.length === 1
                  ? result.candidates[0].cellType
                  : `${result.candidates.length} possible cell types`
                : statusLabels[result.status]}
            </h3>
            <p className={styles.resultDescription}>
              {result.status === "matches_found"
                ? "Your markers overlap with published evidence. Review the genes before choosing a label."
                : result.status === "no_matches"
                  ? "None of your genes matched this tissue reference. Try another reference or keep the label open."
                  : "The lookup needs compatible sample details before genes can be compared."}
            </p>
          </div>
          {queried && (
            <div className={styles.matchMetric}>
              <div>
                <strong>{result.matchedGenes.length}</strong>
                <span> / {result.marker.genes.length}</span>
              </div>
              <CountBar
                segments={[
                  { count: result.matchedGenes.length, tone: "match" },
                  {
                    count:
                      result.marker.genes.length - result.matchedGenes.length,
                    tone: "neutral",
                  },
                ]}
                label={`${result.matchedGenes.length} of ${result.marker.genes.length} submitted genes matched`}
              />
              <span>genes matched</span>
            </div>
          )}
        </div>
        {result.issues.length > 0 && (
          <ul className={styles.evidenceIssues}>
            {result.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        {result.candidates.length > 0 && (
          <div className={styles.candidates} aria-label="Candidate cell types">
            {result.candidates.map((candidate) =>
              result.candidates.length === 1 ? (
                <MarkerEvidenceView
                  key={candidate.cellType}
                  candidate={candidate}
                  source={result.source}
                />
              ) : (
                <details key={candidate.cellType} className={styles.candidate}>
                  <summary>
                    <span>{candidate.cellType}</span>
                    <span>
                      {candidate.matchedGenes.length} matching{" "}
                      {candidate.matchedGenes.length === 1 ? "gene" : "genes"}
                    </span>
                  </summary>
                  <MarkerEvidenceView
                    candidate={candidate}
                    source={result.source}
                  />
                </details>
              ),
            )}
          </div>
        )}
        {result.sharedGenes.length > 0 && (
          <details className={styles.sampleDetails}>
            <summary>Shared markers ({result.sharedGenes.length})</summary>
            <ul>
              {result.sharedGenes.map((item) => (
                <li key={item.geneId}>
                  <code>{item.geneId}</code>: {item.cellTypes.join(", ")}
                </li>
              ))}
            </ul>
          </details>
        )}
        {result.unmatchedGenes.length > 0 && (
          <details className={styles.sampleDetails}>
            <summary>
              Not found in this tissue reference ({result.unmatchedGenes.length}
              )
            </summary>
            <p>{result.unmatchedGenes.join(", ")}</p>
            <p>
              This does not mean these genes are absent or biologically
              irrelevant.
            </p>
          </details>
        )}
        {result.unsupportedGenes.length > 0 && (
          <details className={styles.sampleDetails}>
            <summary>
              Identifiers not converted ({result.unsupportedGenes.length})
            </summary>
            <p>{result.unsupportedGenes.join(", ")}</p>
          </details>
        )}
        <details className={styles.sampleDetails}>
          <summary>Reference, method and limits</summary>
          {result.source.delivery && (
            <p>
              Reference retrieved through {result.source.delivery.provider} and
              verified against the published version.
            </p>
          )}
          <p>
            <a
              href={result.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {result.source.citation} ↗
            </a>
          </p>
          <p>{result.source.coverage}</p>
          <dl className={styles.sourceFacts}>
            <div>
              <dt>Reference version</dt>
              <dd>{result.source.version}</dd>
            </div>
            <div>
              <dt>Genome / annotation</dt>
              <dd>{result.source.genomeVersion}</dd>
            </div>
            <div>
              <dt>Gene IDs</dt>
              <dd>{result.source.geneIdNamespace}</dd>
            </div>
            <div>
              <dt>Source section</dt>
              <dd>{result.source.section}</dd>
            </div>
            <div>
              <dt>Lookup method</dt>
              <dd>
                Exact gene IDs within the saved tissue. Candidates shown
                alphabetically; no ranking or probability.
              </dd>
            </div>
          </dl>
          <ul>
            {result.limitations.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
          <p>
            Reference checksum <code>{result.source.referenceSha256}</code>
          </p>
          <p>
            Lookup{" "}
            <time dateTime={result.createdAt}>
              {new Date(result.createdAt).toLocaleString("en-GB", {
                timeZone: "UTC",
              })}{" "}
              UTC
            </time>
          </p>
        </details>
        <details className={styles.review}>
          <summary>
            {receipt ? "Saved review" : "Review and save your decision"}
          </summary>
          {receipt ? (
            <div role="status">
              <p>
                <strong>
                  {receipt.decision === "candidate"
                    ? receipt.cellType
                    : receipt.decision === "unresolved"
                      ? "Unresolved"
                      : "Evidence rejected"}
                </strong>{" "}
                · Saved by you
              </p>
              {receipt.notes && (
                <p className={styles.reviewNotes}>{receipt.notes}</p>
              )}
              <a
                href={`/app/projects/${result.projectId}?before=${BigInt(receipt.position) + BigInt(1)}#entry-${receipt.id}`}
              >
                View saved research record
              </a>
            </div>
          ) : (
            <form onSubmit={submit} aria-label="Review marker evidence">
              <label>
                Your decision
                <select
                  required
                  value={selection}
                  disabled={pending}
                  onChange={(event) => setSelection(event.target.value)}
                >
                  <option value="">Choose a decision…</option>
                  {result.candidates.map((candidate) => (
                    <option
                      key={candidate.cellType}
                      value={`candidate:${candidate.cellType}`}
                    >
                      Candidate: {candidate.cellType}
                    </option>
                  ))}
                  <option value="unresolved">Keep cell type unresolved</option>
                  <option value="rejected">Reject this evidence</option>
                </select>
              </label>
              <label>
                Review notes <span>(optional)</span>
                <textarea
                  rows={3}
                  maxLength={10000}
                  value={notes}
                  disabled={pending}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
              <p>
                Your decision is saved with this exact evidence and sample
                context.
              </p>
              {error && <p role="alert">{error}</p>}
              <button type="submit" disabled={pending || !selection}>
                {pending ? "Saving…" : "Save review"}
              </button>
              {conflict && (
                <button type="submit" name="saveAsNew" disabled={pending}>
                  Save as a new review
                </button>
              )}
            </form>
          )}
        </details>
      </div>
      <footer className={styles.footer}>
        <span className={styles.footerNote}>
          Marker overlap, not a confidence score.
        </span>
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() =>
            onAsk(
              `Explain the evidence and limitations for “${result.marker.label || "my marker set"}” in the result above. Use the saved lookup; do not rerun it.`,
            )
          }
        >
          Discuss evidence
        </button>
      </footer>
    </section>
  );
}
