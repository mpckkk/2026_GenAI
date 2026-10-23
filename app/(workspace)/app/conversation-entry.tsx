import type { PlantContext, PlantDefinition } from "@/app/core/plants";
import type { MarkerEntry, ResearchEntry } from "@/app/core/research";
import styles from "./workspace.module.css";

function plantName(speciesId: string, plants: PlantDefinition[]) {
  const plant = plants.find((item) => item.id === speciesId);
  return plant ? `${plant.commonName} (${plant.scientificName})` : speciesId;
}

export function ContextDetails({
  context,
  plants,
}: {
  context: PlantContext;
  plants: PlantDefinition[];
}) {
  const rows = [
    ["Plant", plantName(context.speciesId, plants)],
    ["Tissue", context.tissue ?? "Not specified"],
    ["Sample", context.sampleLabel ?? "Not specified"],
    ["Developmental stage", context.developmentalStage ?? "Not specified"],
    ["Genome version", context.genomeVersion ?? "Unknown"],
    ["Gene ID namespace", context.geneIdNamespace ?? "Unknown"],
  ];
  return (
    <dl className={styles.detailList}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
      {context.notes && (
        <div>
          <dt>Context notes</dt>
          <dd className={styles.preservedText}>{context.notes}</dd>
        </div>
      )}
    </dl>
  );
}

function EntryContent({
  entry,
  plants,
  markers,
}: {
  entry: ResearchEntry;
  plants: PlantDefinition[];
  markers: MarkerEntry[];
}) {
  switch (entry.kind) {
    case "message":
      return <p className={styles.preservedText}>{entry.text}</p>;
    case "context":
      return (
        <>
          <h3>Plant &amp; sample</h3>
          <ContextDetails context={entry.context} plants={plants} />
        </>
      );
    case "markers":
      return (
        <>
          <div className={styles.entryTitle}>
            <h3>{entry.label ?? "Markers"}</h3>
            <span className={styles.tag}>{entry.genes.length} markers</span>
          </div>
          <p className={styles.smallMuted}>
            {plantName(entry.speciesId, plants)}
          </p>
          <ul className={styles.geneList} aria-label="Parsed markers">
            {entry.genes.map((gene) => (
              <li key={gene}>{gene}</li>
            ))}
          </ul>
          <details className={styles.entryDetails}>
            <summary>Original marker text</summary>
            <pre className={styles.rawMarkers}>{entry.markersRaw}</pre>
          </details>
          {entry.context ? (
            <details className={styles.entryDetails}>
              <summary>Sample context saved with these markers</summary>
              <ContextDetails context={entry.context} plants={plants} />
            </details>
          ) : (
            <p className={styles.smallMuted}>
              No sample context was attached to these markers.
            </p>
          )}
        </>
      );
    case "manual_review": {
      const marker = markers.find((item) => item.id === entry.markerEntryId);
      return (
        <>
          <h3>Your annotation</h3>
          <p className={styles.reviewCellType}>
            {entry.cellType ?? "Cell type undecided"}
          </p>
          <p className={styles.smallMuted}>
            For {marker?.label ?? "marker set"} ·{" "}
            <span title={entry.markerEntryId}>
              {entry.markerEntryId.slice(0, 8)}
            </span>
          </p>
          {entry.evidenceText && (
            <div className={styles.reviewSection}>
              <h4>Your supporting evidence</h4>
              <p className={styles.preservedText}>{entry.evidenceText}</p>
            </div>
          )}
          {entry.notes && (
            <div className={styles.reviewSection}>
              <h4>Your notes</h4>
              <p className={styles.preservedText}>{entry.notes}</p>
            </div>
          )}
          <p className={styles.manualLabel}>
            Recorded by you. Reference evidence has not been checked by
            Celloras.
          </p>
        </>
      );
    }
    default: {
      const unrecognized: never = entry;
      void unrecognized;
      throw new Error("Unsupported research entry type.");
    }
  }
}

export function ConversationEntry({
  entry,
  plants,
  markers,
}: {
  entry: ResearchEntry;
  plants: PlantDefinition[];
  markers: MarkerEntry[];
}) {
  const timestamp = new Date(entry.createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return (
    <li
      id={`entry-${entry.id}`}
      className={styles.entry}
      data-entry-kind={entry.kind}
    >
      <div className={styles.entryMeta}>
        <span>
          You{entry.kind === "manual_review" ? " · Manual review" : ""}
        </span>
        <time dateTime={entry.createdAt}>{timestamp} UTC</time>
      </div>
      <article
        className={
          entry.kind === "message"
            ? styles.messageBubble
            : styles.structuredCard
        }
      >
        <EntryContent entry={entry} plants={plants} markers={markers} />
      </article>
    </li>
  );
}
