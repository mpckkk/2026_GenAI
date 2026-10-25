"use client";

import { useId, useRef, useState } from "react";
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
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const row = rows[selected];
  const hasCrossSpecies = rows.some((row) => row.crossSpecies);
  function inspect(index: number) {
    setSelected(index);
    dialog.current?.showModal();
  }
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
              aria-haspopup="dialog"
              onClick={() => inspect(index)}
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
      <dialog
        ref={dialog}
        className={styles.inspector}
        aria-labelledby={titleId}
      >
        {row && (
          <>
            <header className={styles.inspectorHeader}>
              <span>Gene evidence</span>
              <button
                type="button"
                autoFocus
                aria-label="Close gene evidence"
                onClick={() => dialog.current?.close()}
              >
                <WorkspaceIcon name="close" size={20} />
              </button>
            </header>
            <div className={styles.inspectorBody} key={row.record.id}>
              <p className={styles.eyebrow}>
                {candidate.cellType} · {row.record.tissue}
              </p>
              <h2 id={titleId}>{row.record.geneId}</h2>
              <div
                className={styles.evidenceType}
                data-cross-species={
                  row.crossSpecies === null
                    ? "unknown"
                    : String(row.crossSpecies)
                }
              >
                <span className={styles.species}>
                  <i aria-hidden="true" />
                  {row.species
                    ? `${row.species} reference`
                    : "Reference species not recorded"}
                </span>
                <p>
                  {row.crossSpecies === true
                    ? "The atlas links this soybean gene to a reference from another species. This does not establish soybean-specific expression."
                    : row.crossSpecies === false
                      ? "The atlas lists a soybean reference for this marker. Check the study context before accepting the cell-type label."
                      : "The saved lookup does not specify the original reference species. Open the published source to check its context."}
                </p>
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>Cell-type association</dt>
                  <dd>{row.record.cellType}</dd>
                </div>
                <div>
                  <dt>Sample tissue</dt>
                  <dd>{row.record.tissue}</dd>
                </div>
                <div>
                  <dt>Reference location</dt>
                  <dd>{row.locator || source.section}</dd>
                </div>
                {row.record.sourceLabel !== row.record.cellType && (
                  <div>
                    <dt>Published label</dt>
                    <dd>{row.record.sourceLabel}</dd>
                  </div>
                )}
              </dl>
              <div className={styles.sourceActions}>
                {row.studyUrl && (
                  <a
                    href={row.studyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {row.originalReference
                      ? "Open cited study"
                      : "Open published source"}{" "}
                    <span>↗</span>
                  </a>
                )}
                {row.originalReference && row.sourceUrl && (
                  <a
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-secondary="true"
                  >
                    Open atlas source row <span>↗</span>
                  </a>
                )}
              </div>
              <details className={styles.original}>
                <summary>Full saved provenance</summary>
                <p>{row.record.stage}</p>
                <p>{row.record.method}</p>
                <p>{source.citation}</p>
              </details>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
