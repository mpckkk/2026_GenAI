"use client";

import { useId, useState } from "react";
import type {
  EvidenceCandidate,
  MarkerReferenceSource,
} from "@/app/core/evidence";
import { WorkspaceIcon } from "./workspace-icons";
import { markerProvenance, referenceHost } from "./marker-provenance";
import styles from "./marker-evidence-view.module.css";

export function MarkerEvidenceView({
  candidate,
  source,
}: {
  candidate: EvidenceCandidate;
  source: MarkerReferenceSource;
}) {
  const rows = candidate.records.map((record) => ({
    record,
    ...markerProvenance(record, source),
  }));
  const studies = [
    ...new Set(
      rows.map((row) => row.studyUrl).filter((url): url is string => !!url),
    ),
  ];
  const [selected, setSelected] = useState<number | null>(null);
  const detailsId = useId();
  const hasCrossSpecies = rows.some((row) => row.crossSpecies);
  return (
    <div className={styles.evidence}>
      <div className={styles.matrixHeading}>
        <h4>Matching genes</h4>
        <span>
          {candidate.matchedGenes.length}{" "}
          {candidate.matchedGenes.length === 1 ? "gene" : "genes"} ·{" "}
          {studies.length} {studies.length === 1 ? "source" : "sources"}
        </span>
      </div>
      <div className={styles.columns} aria-hidden="true">
        <span>Your gene</span>
        <span>Reference species</span>
        <span>Source</span>
        <span />
      </div>
      <ul className={styles.rows} aria-label={`${candidate.cellType} evidence`}>
        {rows.map((item, index) => (
          <li key={item.record.id}>
            <button
              type="button"
              className={styles.geneRow}
              aria-label={`Inspect evidence for ${item.record.geneId}`}
              aria-expanded={selected === index}
              aria-controls={`${detailsId}-${index}`}
              onClick={() => setSelected(selected === index ? null : index)}
            >
              <code>{item.record.geneId}</code>
              <span
                className={styles.species}
                data-cross-species={
                  item.crossSpecies === null
                    ? "unknown"
                    : String(item.crossSpecies)
                }
              >
                <i aria-hidden="true" />
                {item.species || "Not recorded"}
              </span>
              <span className={styles.sourceIndex}>
                {item.studyUrl
                  ? String(studies.indexOf(item.studyUrl) + 1).padStart(2, "0")
                  : "—"}
              </span>
              <WorkspaceIcon name="chevron" size={15} />
            </button>
            {selected === index && (
              <div
                id={`${detailsId}-${index}`}
                role="region"
                aria-label={`Evidence for ${item.record.geneId}`}
                className={styles.inlineEvidence}
              >
                <p className={styles.location}>
                  {item.locator || source.section}
                </p>
                <p className={styles.evidenceNote}>
                  {item.crossSpecies === true
                    ? `${item.species} reference mapped to this soybean gene. Check the original study for species-specific evidence.`
                    : item.crossSpecies === false
                      ? "The atlas cites a soybean study for this marker."
                      : "The saved source does not specify the original reference species."}
                </p>
                <div className={styles.sourceActions}>
                  {item.studyUrl && (
                    <a
                      href={item.studyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.originalReference
                        ? "Read cited study"
                        : "Read published source"}{" "}
                      ↗
                    </a>
                  )}
                  {item.originalReference && item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open atlas source row ↗
                    </a>
                  )}
                </div>
                <details className={styles.original}>
                  <summary>Full saved provenance</summary>
                  <p>
                    {item.record.sourceLabel} · {item.record.tissue} ·{" "}
                    {item.record.stage}
                  </p>
                  <p>{item.record.method}</p>
                  <p>{source.citation}</p>
                </details>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.hint}>Select a gene to inspect its evidence.</p>
      {studies.length > 0 && (
        <div className={styles.references}>
          <h5>Sources behind the matches</h5>
          <ol className={styles.studies}>
            {studies.map((url, index) => {
              const records = rows.filter((row) => row.studyUrl === url);
              const genes = new Set(records.map((row) => row.record.geneId))
                .size;
              return (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Source ${index + 1}: ${referenceHost(url)}`}
                  >
                    <span className={styles.studyIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{referenceHost(url)}</strong>
                      <small>
                        {genes} {genes === 1 ? "gene" : "genes"} ·{" "}
                        {records[0].studyKind.toLowerCase()}
                      </small>
                    </span>
                    <span className={styles.external} aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {hasCrossSpecies && (
        <p className={styles.contextNote}>
          <WorkspaceIcon name="leaf" size={15} />
          <span>
            Some references come from another species. A match is a starting
            point for review.
          </span>
        </p>
      )}
    </div>
  );
}
