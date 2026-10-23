"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PlantContext, PlantDefinition } from "@/app/core/plants";
import type {
  ContextEntry,
  MarkerEntry,
  ResearchActionState,
  ResearchCommand,
} from "@/app/core/research";
import { appendResearch } from "./actions";
import styles from "./workspace.module.css";

type Mode = "message" | "context" | "markers" | "manual_review";

function optional(value: string) {
  return value.trim() || null;
}

export function ConversationComposer({
  projectId,
  plants,
  context,
  markers,
}: {
  projectId: string;
  plants: PlantDefinition[];
  context: ContextEntry | null;
  markers: MarkerEntry[];
}) {
  const router = useRouter();
  const initialSpecies = context?.context.speciesId ?? plants[0]?.id ?? "";
  const [mode, setMode] = useState<Mode>("message");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ResearchActionState>({ status: "idle" });
  const submissionIds = useRef<Partial<Record<Mode, string>>>({});
  const [text, setText] = useState("");
  const [contextDraft, setContextDraft] = useState<PlantContext>(
    context?.context ?? {
      speciesId: initialSpecies,
      tissue: null,
      sampleLabel: null,
      developmentalStage: null,
      genomeVersion: null,
      geneIdNamespace: null,
      notes: "",
    },
  );
  const [markerSpecies, setMarkerSpecies] = useState(initialSpecies);
  const [markerLabel, setMarkerLabel] = useState("");
  const [markersRaw, setMarkersRaw] = useState("");
  const [attachContext, setAttachContext] = useState(true);
  const [markerEntryId, setMarkerEntryId] = useState(markers[0]?.id ?? "");
  const [cellType, setCellType] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [notes, setNotes] = useState("");
  const selectedPlant = plants.find(
    (plant) => plant.id === contextDraft.speciesId,
  );
  const compatibleContext =
    context?.context.speciesId === markerSpecies ? context : null;
  const selectedMarkerId = markerEntryId || markers[0]?.id || "";

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setState({ status: "idle" });
  }

  function updateContext(key: keyof PlantContext, value: string) {
    setContextDraft((draft) => ({ ...draft, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const saveAsNew =
      submitter instanceof HTMLButtonElement && submitter.name === "saveAsNew";
    // Only an explicit recovery from a confirmed conflict can begin a new save.
    if (
      saveAsNew &&
      !(state.status === "error" && state.code === "SUBMISSION_CONFLICT")
    )
      return;
    let command: ResearchCommand;
    switch (mode) {
      case "message":
        command = { kind: "message", text };
        break;
      case "context":
        command = {
          kind: "context",
          context: {
            ...contextDraft,
            tissue: optional(contextDraft.tissue ?? ""),
            sampleLabel: optional(contextDraft.sampleLabel ?? ""),
            developmentalStage: optional(contextDraft.developmentalStage ?? ""),
            genomeVersion: optional(contextDraft.genomeVersion ?? ""),
            geneIdNamespace: optional(contextDraft.geneIdNamespace ?? ""),
          },
        };
        break;
      case "markers":
        command = {
          kind: "markers",
          speciesId: markerSpecies,
          label: optional(markerLabel),
          markersRaw,
          contextEntryId: attachContext
            ? (compatibleContext?.id ?? null)
            : null,
        };
        break;
      case "manual_review":
        command = {
          kind: "manual_review",
          markerEntryId: selectedMarkerId,
          cellType: optional(cellType),
          evidenceText,
          notes,
        };
        break;
    }
    setPending(true);
    setState({ status: "idle" });
    try {
      // The same ID survives an uncertain response, so a retry cannot duplicate a save.
      const submissionId = saveAsNew
        ? crypto.randomUUID()
        : (submissionIds.current[mode] ?? crypto.randomUUID());
      submissionIds.current[mode] = submissionId;
      const result = await appendResearch(projectId, { submissionId, command });
      setState(result);
      if (result.status === "saved") {
        delete submissionIds.current[mode];
        switch (result.entry.kind) {
          case "message":
            setText("");
            break;
          case "context":
            setContextDraft(result.entry.context);
            setMarkerSpecies(result.entry.context.speciesId);
            setAttachContext(true);
            break;
          case "markers":
            setMarkersRaw("");
            setMarkerLabel("");
            setMarkerEntryId(result.entry.id);
            break;
          case "manual_review":
            setCellType("");
            setEvidenceText("");
            setNotes("");
            break;
        }
        // Move back to the latest page if this entry was added while reading older history.
        router.replace(`/app/projects/${projectId}`, { scroll: false });
        router.refresh();
      }
    } catch {
      setState({
        status: "error",
        message:
          "The save could not be confirmed. Your draft is still here; retry to check or complete the same save.",
      });
    } finally {
      setPending(false);
    }
  }

  const actionLabels: Record<Mode, string> = {
    message: "Save note",
    context: "Save sample context",
    markers: "Save markers",
    manual_review: "Save review",
  };
  const fieldLabels: Record<string, string> = {
    text: "Note",
    speciesId: "Plant",
    tissue: "Tissue",
    sampleLabel: "Sample label",
    developmentalStage: "Developmental stage",
    genomeVersion: "Genome version",
    geneIdNamespace: "Gene ID namespace",
    label: "Cluster or marker-set label",
    markersRaw: "Marker genes",
    contextEntryId: "Sample context",
    markerEntryId: "Marker set",
    cellType: "Review",
    evidenceText: "Supporting evidence",
    notes: mode === "context" ? "Sample notes" : "Review notes",
  };
  const savedLabels: Record<Mode, string> = {
    message: "Note saved to this experiment.",
    context:
      "Sample context saved. Earlier marker sets keep their original context.",
    markers: "Markers saved to this experiment.",
    manual_review: "Your review was saved with its marker set.",
  };

  return (
    <section className={styles.composer} aria-label="Add to conversation">
      <div
        className={styles.composerModes}
        role="group"
        aria-label="Entry type"
      >
        {(
          [
            ["message", "Note"],
            ["context", "Plant & sample"],
            ["markers", "Add markers"],
            ["manual_review", "Record review"],
          ] as const
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={mode === value}
            disabled={pending}
            onClick={() => selectMode(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} aria-busy={pending}>
        <fieldset disabled={pending} className={styles.composerFields}>
          {mode === "message" && (
            <div className={styles.field}>
              <label htmlFor="research-note">
                Add a note to the conversation
              </label>
              <textarea
                id="research-note"
                name="text"
                placeholder="What are you investigating in this experiment?"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                maxLength={10000}
                required
              />
              <p className={styles.fieldHint}>
                Notes are saved as your messages. AI replies are not connected
                yet.
              </p>
            </div>
          )}
          {mode === "context" && (
            <>
              <div className={styles.formIntro}>
                <h3>Plant &amp; sample</h3>
                <p>Add what you know. You can leave the other details blank.</p>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="context-species">Plant</label>
                  <select
                    id="context-species"
                    value={contextDraft.speciesId}
                    onChange={(event) =>
                      updateContext("speciesId", event.target.value)
                    }
                    required
                  >
                    {plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.commonName} ({plant.scientificName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="context-tissue">
                    Tissue <span>(optional)</span>
                  </label>
                  <input
                    id="context-tissue"
                    list="tissue-options"
                    value={contextDraft.tissue ?? ""}
                    onChange={(event) =>
                      updateContext("tissue", event.target.value)
                    }
                    maxLength={120}
                    placeholder="Choose or enter a tissue"
                  />
                  <datalist id="tissue-options">
                    {selectedPlant?.suggestedTissues.map((tissue) => (
                      <option key={tissue} value={tissue} />
                    ))}
                  </datalist>
                </div>
                <div className={styles.field}>
                  <label htmlFor="context-sample">
                    Sample label <span>(optional)</span>
                  </label>
                  <input
                    id="context-sample"
                    value={contextDraft.sampleLabel ?? ""}
                    onChange={(event) =>
                      updateContext("sampleLabel", event.target.value)
                    }
                    maxLength={120}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="context-stage">
                    Developmental stage <span>(optional)</span>
                  </label>
                  <input
                    id="context-stage"
                    value={contextDraft.developmentalStage ?? ""}
                    onChange={(event) =>
                      updateContext("developmentalStage", event.target.value)
                    }
                    maxLength={120}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="context-genome">
                    Genome version <span>(optional)</span>
                  </label>
                  <input
                    id="context-genome"
                    value={contextDraft.genomeVersion ?? ""}
                    onChange={(event) =>
                      updateContext("genomeVersion", event.target.value)
                    }
                    maxLength={120}
                    placeholder="Leave blank if unknown"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="context-namespace">
                    Gene ID namespace <span>(optional)</span>
                  </label>
                  <input
                    id="context-namespace"
                    value={contextDraft.geneIdNamespace ?? ""}
                    onChange={(event) =>
                      updateContext("geneIdNamespace", event.target.value)
                    }
                    maxLength={120}
                    placeholder="Leave blank if unknown"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="context-notes">
                  Sample notes <span>(optional)</span>
                </label>
                <textarea
                  id="context-notes"
                  rows={3}
                  value={contextDraft.notes}
                  onChange={(event) =>
                    updateContext("notes", event.target.value)
                  }
                  maxLength={5000}
                />
              </div>
              <p className={styles.fieldHint}>
                Saving creates a new context entry. Existing marker sets retain
                their saved sample context.
              </p>
            </>
          )}
          {mode === "markers" && (
            <>
              <div className={styles.formIntro}>
                <h3>Add markers</h3>
                <p>
                  Save a cluster’s marker genes without needing to decide its
                  cell type yet.
                </p>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="marker-species">
                    Plant for these markers
                  </label>
                  <select
                    id="marker-species"
                    value={markerSpecies}
                    onChange={(event) => setMarkerSpecies(event.target.value)}
                    required
                  >
                    {plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.commonName} ({plant.scientificName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="marker-label">
                    Cluster or marker-set label <span>(optional)</span>
                  </label>
                  <input
                    id="marker-label"
                    value={markerLabel}
                    onChange={(event) => setMarkerLabel(event.target.value)}
                    maxLength={120}
                    placeholder="e.g. Cluster 4"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="marker-genes">Marker genes</label>
                <textarea
                  id="marker-genes"
                  name="markersRaw"
                  value={markersRaw}
                  onChange={(event) => setMarkersRaw(event.target.value)}
                  rows={5}
                  required
                  maxLength={20000}
                  aria-describedby="markers-help"
                  placeholder="Paste gene IDs separated by spaces, commas, semicolons or new lines"
                />
                <p id="markers-help" className={styles.fieldHint}>
                  Up to 200 distinct markers. We keep your original text; gene
                  IDs are not mapped or validated against a reference yet.
                </p>
              </div>
              {compatibleContext ? (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={attachContext}
                    onChange={(event) => setAttachContext(event.target.checked)}
                  />
                  <span>
                    Attach current sample context
                    {compatibleContext.context.tissue
                      ? ` · ${compatibleContext.context.tissue}`
                      : ""}
                    {compatibleContext.context.sampleLabel
                      ? ` · ${compatibleContext.context.sampleLabel}`
                      : ""}
                  </span>
                </label>
              ) : (
                <p className={styles.fieldHint}>
                  These markers will be saved without sample context. Use Plant
                  &amp; sample to add it before saving.
                </p>
              )}
            </>
          )}
          {mode === "manual_review" && (
            <>
              <div className={styles.formIntro}>
                <h3>Record your review</h3>
                <p>
                  Keep your interpretation and evidence with a saved marker set.
                </p>
              </div>
              {markers.length ? (
                <>
                  <div className={styles.field}>
                    <label htmlFor="review-markers">Marker set</label>
                    <select
                      id="review-markers"
                      value={selectedMarkerId}
                      onChange={(event) => setMarkerEntryId(event.target.value)}
                      required
                    >
                      {markers.map((marker) => (
                        <option key={marker.id} value={marker.id}>
                          {marker.label ?? "Untitled markers"} ·{" "}
                          {marker.genes.length} markers ·{" "}
                          {marker.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    <p className={styles.fieldHint}>
                      Your 100 most recent marker sets, plus marker sets
                      referenced on this history page.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="review-cell-type">
                      Cell type <span>(optional)</span>
                    </label>
                    <input
                      id="review-cell-type"
                      value={cellType}
                      onChange={(event) => setCellType(event.target.value)}
                      maxLength={120}
                      placeholder="Leave blank if undecided"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="review-evidence">
                      Your supporting evidence <span>(optional)</span>
                    </label>
                    <textarea
                      id="review-evidence"
                      value={evidenceText}
                      onChange={(event) => setEvidenceText(event.target.value)}
                      rows={4}
                      maxLength={5000}
                      placeholder="Markers, references or observations that support your interpretation"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="review-notes">
                      Review notes <span>(optional)</span>
                    </label>
                    <textarea
                      id="review-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      maxLength={10000}
                      placeholder="Uncertainty, conflicting evidence or next steps"
                    />
                  </div>
                  <p className={styles.fieldHint}>
                    Add a cell type, supporting evidence or notes. Celloras has
                    not verified the supporting evidence.
                  </p>
                </>
              ) : (
                <p className={styles.fieldHint}>
                  Save markers first, then return here to record your review.
                </p>
              )}
            </>
          )}
          {state.status === "error" && (
            <div role="alert" className={styles.errorBox}>
              <p>{state.message}</p>
              {state.code === "SUBMISSION_CONFLICT" && (
                <div className={styles.reviewSection}>
                  <button
                    className={styles.primaryButton}
                    type="submit"
                    name="saveAsNew"
                    value="true"
                  >
                    Save as a new entry
                  </button>
                </div>
              )}
              {state.fields && Object.keys(state.fields).length > 0 && (
                <ul>
                  {Object.entries(state.fields).map(([field, message]) => (
                    <li key={field}>
                      {fieldLabels[field] ? `${fieldLabels[field]}: ` : ""}
                      {message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className={styles.composerFooter}>
            <p className={styles.fieldHint}>
              Saved in this experiment’s conversation.
            </p>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={
                pending || (mode === "manual_review" && markers.length === 0)
              }
            >
              {pending ? "Saving…" : actionLabels[mode]}
            </button>
          </div>
        </fieldset>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {state.status === "saved" && (
          <p className={styles.savedReceipt}>
            <strong>System · </strong>
            {savedLabels[state.entry.kind]}{" "}
            <a href={`#entry-${state.entry.id}`}>View saved entry</a>
          </p>
        )}
      </div>
    </section>
  );
}
