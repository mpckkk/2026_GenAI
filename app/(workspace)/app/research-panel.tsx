"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { PlantDefinition } from "@/app/core/plants";
import type { ScientificDataset } from "@/app/core/scientific-data";
import type {
  ContextEntry,
  MarkerEntry,
  ResearchEntry,
  ResearchWorkspace,
} from "@/app/core/research";
import {
  ConversationComposer,
  type ResearchComposerMode,
} from "./conversation-composer";
import { ContextDetails, ConversationEntry } from "./conversation-entry";
import styles from "./research-panel.module.css";

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function byPosition(a: ResearchEntry, b: ResearchEntry) {
  const left = BigInt(a.position);
  const right = BigInt(b.position);
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueEntries<T extends ResearchEntry>(entries: T[]): T[] {
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()].sort(
    byPosition,
  );
}

export function ResearchPanel({
  projectId,
  workspace,
  plants,
  before,
  dataset,
}: {
  projectId: string;
  workspace: ResearchWorkspace;
  plants: PlantDefinition[];
  before?: string;
  dataset?: ScientificDataset | null;
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const recordsHeadingRef = useRef<HTMLHeadingElement>(null);
  const [editorMode, setEditorMode] = useState<ResearchComposerMode>("message");
  const [viewState, setViewState] = useState<{
    value: "editor" | "records";
    before?: string;
  }>({ value: before ? "records" : "editor", before });
  const [committed, setCommitted] = useState<ResearchEntry[]>([]);
  const [focusedSelection, setFocusedSelection] = useState<{
    id: string;
    before?: string;
  } | null>(null);
  const focusedEntryId =
    focusedSelection?.before === before ? (focusedSelection?.id ?? null) : null;
  const view =
    before && before !== viewState.before ? "records" : viewState.value;
  const entries = uniqueEntries([
    ...workspace.page.entries,
    ...(!before ? committed : []),
  ]);
  const markers = uniqueEntries([
    ...workspace.markers,
    ...committed.filter(
      (entry): entry is MarkerEntry => entry.kind === "markers",
    ),
  ]).reverse();
  const contexts = uniqueEntries([
    ...(workspace.context ? [workspace.context] : []),
    ...committed.filter(
      (entry): entry is ContextEntry => entry.kind === "context",
    ),
  ]);
  const latestContext = contexts.at(-1) ?? null;
  const context = latestContext?.context;
  const plant = plants.find((item) => item.id === context?.speciesId);
  const notes = entries
    .filter((entry) => entry.kind === "message")
    .reverse()
    .slice(0, 3);
  const focusedEntry = [...entries, ...committed, ...markers].find(
    (entry) => entry.id === focusedEntryId,
  );
  const displayedEntries = focusedEntry ? [focusedEntry] : entries;

  useEffect(() => {
    if (before && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [before, hydrated]);

  function openDialog() {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }

  function showEditor(mode: ResearchComposerMode = editorMode) {
    setEditorMode(mode);
    setViewState({ value: "editor", before });
    openDialog();
    window.requestAnimationFrame(() => {
      editorRef.current
        ?.querySelector<HTMLElement>("textarea, input, select")
        ?.focus();
    });
  }

  function showRecords(entryId?: string) {
    setViewState({ value: "records", before });
    setFocusedSelection(entryId ? { id: entryId, before } : null);
    openDialog();
    window.requestAnimationFrame(() => {
      if (entryId)
        document
          .getElementById(`entry-${entryId}`)
          ?.scrollIntoView({ block: "center" });
      recordsHeadingRef.current?.focus({ preventScroll: Boolean(entryId) });
    });
  }

  function saved(entry: ResearchEntry) {
    setCommitted((current) => uniqueEntries([...current, entry]));
  }

  return (
    <div className={styles.panel}>
      {dataset && (
        <section className={styles.panelSection} aria-label="Dataset context">
          <h3>
            {dataset.source.kind === "uploaded-h5ad"
              ? "Your dataset"
              : "Published dataset"}
          </h3>
          <p className={styles.scopeNote}>
            {dataset.source.kind === "uploaded-h5ad"
              ? dataset.source.filename
              : `Source metadata · ${dataset.source.accession}`}
          </p>
          <dl className={styles.contextList}>
            <div>
              <dt>Plant</dt>
              <dd>
                {plants.find((item) => item.id === dataset.speciesId)
                  ?.commonName ?? dataset.species}
              </dd>
            </div>
            <div>
              <dt>Tissue</dt>
              <dd>{dataset.tissue}</dd>
            </div>
            <div>
              <dt>Cells / nuclei</dt>
              <dd>{dataset.nCells.toLocaleString("en-GB")}</dd>
            </div>
            <div>
              <dt>Genome</dt>
              <dd>{dataset.genomeBuild}</dd>
            </div>
          </dl>
          {dataset.source.paperUrl && (
            <a
              className={styles.textAction}
              href={dataset.source.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read atlas paper ↗
            </a>
          )}
          <p className={styles.scopeNote}>
            {dataset.source.kind === "uploaded-h5ad"
              ? "Cell groups and coordinates from your uploaded file."
              : "Published research data. Source cluster IDs are group identifiers, not new cell-type annotations."}
          </p>
        </section>
      )}
      <section
        className={styles.panelSection}
        aria-label="Latest sample context"
      >
        {dataset && <h3>Your sample context</h3>}
        {context || !dataset ? (
          <dl className={styles.contextList}>
            <div>
              <dt>Plant</dt>
              <dd>{plant?.commonName ?? context?.speciesId ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Tissue</dt>
              <dd>{context?.tissue ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Sample</dt>
              <dd>{context?.sampleLabel ?? "Not set"}</dd>
            </div>
            {context?.developmentalStage && (
              <div>
                <dt>Stage</dt>
                <dd>{context.developmentalStage}</dd>
              </div>
            )}
            {context?.genomeVersion && (
              <div>
                <dt>Genome</dt>
                <dd>{context.genomeVersion}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className={styles.emptyText}>
            No additional context recorded by you. Dataset metadata is shown
            above.
          </p>
        )}
        <button
          type="button"
          className={styles.textAction}
          onClick={() => showEditor("context")}
        >
          {dataset && !context ? "Add research context" : "Edit context"}
        </button>
      </section>
      <section
        className={styles.panelSection}
        aria-labelledby="panel-markers-heading"
      >
        <div className={styles.sectionHeading}>
          <h3 id="panel-markers-heading">
            {dataset ? "Your marker lists" : "Recent markers"}
          </h3>
        </div>
        {markers.length ? (
          <ul className={styles.summaryList}>
            {markers.slice(0, 3).map((marker) => (
              <li key={marker.id}>
                <button
                  type="button"
                  className={styles.summaryButton}
                  onClick={() => showRecords(marker.id)}
                >
                  <span className={styles.recordIcon} aria-hidden="true">
                    ≡
                  </span>
                  <span>
                    <strong>{marker.label ?? "Marker set"}</strong>
                    <small>
                      {marker.genes.length} markers ·{" "}
                      {marker.context?.tissue ?? "No tissue context"}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>
            {dataset
              ? "No marker lists added by you. Computed markers are saved in the conversation."
              : "No saved marker sets."}
          </p>
        )}
        <button
          type="button"
          className={styles.textAction}
          onClick={() => showEditor("markers")}
        >
          Add markers
        </button>
      </section>
      <section
        className={styles.panelSection}
        aria-labelledby="panel-notes-heading"
      >
        <h3 id="panel-notes-heading">Research notes</h3>
        {notes.length ? (
          <ul className={styles.summaryList}>
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className={styles.noteButton}
                  onClick={() => showRecords(note.id)}
                >
                  <span>{note.text}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>
            {before ? "No notes on this history page." : "No recent notes."}
          </p>
        )}
        <p className={styles.scopeNote}>
          {before
            ? "Notes from this history page."
            : "Recent notes from this experiment."}
        </p>
        <button
          type="button"
          className={styles.textAction}
          onClick={() => showEditor("message")}
        >
          Add note
        </button>
      </section>
      <button
        type="button"
        className={styles.recordsButton}
        onClick={() => showRecords()}
      >
        Research records <span aria-hidden="true">↗</span>
      </button>
      <p className={styles.footnote}>
        Your saved context, marker lists and manual reviews. Computed results
        and their interpretations stay with the conversation cards. Cell-type
        interpretations require evidence and your review.
      </p>

      {hydrated &&
        createPortal(
          <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby="research-dialog-title"
          >
            <header className={styles.dialogHeader}>
              <div>
                <h2 id="research-dialog-title">Research workspace</h2>
                <p>Sample context, marker sets and your own research notes.</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Close research workspace"
                onClick={() => dialogRef.current?.close()}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div
              className={styles.viewButtons}
              role="group"
              aria-label="Research workspace view"
            >
              <button
                type="button"
                aria-pressed={view === "editor"}
                onClick={() => showEditor()}
              >
                Edit research
              </button>
              <button
                type="button"
                aria-pressed={view === "records"}
                onClick={() => showRecords()}
              >
                Research records
              </button>
            </div>
            <div className={styles.dialogBody}>
              <div ref={editorRef} hidden={view !== "editor"}>
                <ConversationComposer
                  projectId={projectId}
                  plants={plants}
                  context={latestContext}
                  markers={markers}
                  initialMode="message"
                  mode={editorMode}
                  onModeChange={setEditorMode}
                  onSaved={saved}
                  onViewSavedEntry={(entry) => {
                    saved(entry);
                    showRecords(entry.id);
                  }}
                />
              </div>
              <section
                hidden={view !== "records"}
                aria-labelledby="research-records-heading"
                className={styles.records}
              >
                <div className={styles.recordsHeading}>
                  <h3
                    id="research-records-heading"
                    ref={recordsHeadingRef}
                    tabIndex={-1}
                  >
                    Research records
                  </h3>
                  {before && (
                    <Link
                      href={`/app/projects/${projectId}`}
                      scroll={false}
                      onClick={() => setFocusedSelection(null)}
                    >
                      Latest records
                    </Link>
                  )}
                </div>
                {focusedEntry && (
                  <button
                    type="button"
                    className={styles.textAction}
                    onClick={() => showRecords()}
                  >
                    All records on this page
                  </button>
                )}
                {latestContext && (
                  <details className={styles.contextDetails}>
                    <summary>Current sample context</summary>
                    <ContextDetails
                      context={latestContext.context}
                      plants={plants}
                    />
                  </details>
                )}
                {workspace.page.nextBefore && (
                  <Link
                    className={styles.historyLink}
                    href={`/app/projects/${projectId}?before=${encodeURIComponent(workspace.page.nextBefore)}`}
                    scroll={false}
                    onClick={() => setFocusedSelection(null)}
                  >
                    View older entries
                  </Link>
                )}
                {displayedEntries.length ? (
                  <ol
                    className={styles.recordList}
                    data-focused-entry={focusedEntryId ?? undefined}
                  >
                    {displayedEntries.map((entry) => (
                      <ConversationEntry
                        key={entry.id}
                        entry={entry}
                        plants={plants}
                        markers={markers}
                      />
                    ))}
                  </ol>
                ) : (
                  <p className={styles.emptyRecords}>
                    No research records on this page. Add a note, sample context
                    or marker set to get started.
                  </p>
                )}
              </section>
            </div>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
