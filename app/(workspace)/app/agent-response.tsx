"use client";

import type {
  ResponseDocument,
  ResearchCardBlock,
} from "@/app/core/agent-response.mjs";
import type { PlantDefinition } from "@/app/core/plants";
import { MarkdownMessage } from "@/app/components/markdown-message";
import { ContextDetails, ResearchEntryContent } from "./conversation-entry";
import { WorkspaceIcon, type IconName } from "./workspace-icons";
import type { EvidenceReviewReceipt } from "@/app/core/evidence";
import { EvidenceCard } from "./evidence-card";
import { ScientificCard, type ScientificSelection } from "./scientific-card";
import { LiteratureCard } from "./literature-card";
import type { ScientificResult } from "@/app/core/scientific-data";
import type { GuidedAction } from "./next-actions";
import styles from "./agent-response.module.css";

// New visual types join this finite registry after their contracts/tools exist.
const cards: Record<
  ResearchCardBlock["type"],
  { label: string; icon: IconName }
> = {
  sample_context: { label: "Sample context", icon: "leaf" },
  marker_set: { label: "Marker set", icon: "grid" },
};

export function AgentResponse({
  document,
  reviews,
  plants,
  onAsk,
  actionsDisabled,
  selection,
  onSelect,
  onRun,
  onScientificLoaded,
  scientificActionsDisabled,
}: {
  document: ResponseDocument;
  reviews: Record<string, EvidenceReviewReceipt>;
  plants: PlantDefinition[];
  onAsk: (question: string) => void;
  actionsDisabled: boolean;
  selection: ScientificSelection | null;
  onSelect: (selection: ScientificSelection) => void;
  onRun: (action: GuidedAction) => void;
  onScientificLoaded: (result: ScientificResult) => void;
  scientificActionsDisabled: boolean;
}) {
  if (document.version !== 1) {
    return (
      <p role="alert">
        This response format is not supported. Please refresh the app.
      </p>
    );
  }
  return (
    <div className={styles.response}>
      {document.blocks.map((block, index) => {
        if (block.type === "markdown") {
          return <MarkdownMessage key={index}>{block.text}</MarkdownMessage>;
        }
        if (block.type === "marker_evidence")
          return (
            <EvidenceCard
              key={block.result.id}
              result={block.result}
              review={reviews[block.result.id]}
              onAsk={onAsk}
              actionsDisabled={actionsDisabled}
            />
          );
        if (block.type === "scientific_result")
          return (
            <ScientificCard
              key={block.result.id}
              run={block.result}
              selection={selection}
              onSelect={onSelect}
              onRun={onRun}
              onLoaded={onScientificLoaded}
              actionsDisabled={scientificActionsDisabled}
            />
          );
        if (block.type === "literature_result")
          return (
            <LiteratureCard
              key={block.result.id}
              run={block.result}
              onAsk={onAsk}
              actionsDisabled={actionsDisabled}
            />
          );
        const definition = cards[block.type];
        if (!definition)
          return (
            <p key={index} role="alert">
              This response element is unavailable.
            </p>
          );
        const entry = block.entry;
        const question =
          entry.kind === "markers"
            ? `What should I check next for the marker set “${entry.label || "Markers"}” shown above? Use its saved sample context.`
            : `What information is still missing for the sample “${entry.context.sampleLabel || "my sample"}” shown above?`;
        return (
          <section
            key={`${block.type}-${entry.id}`}
            className={styles.card}
            aria-label={`${definition.label} card`}
            data-response-card={block.type}
            data-record-id={entry.id}
          >
            <header className={styles.header}>
              <span className={styles.icon}>
                <WorkspaceIcon name={definition.icon} size={19} />
              </span>
              <span>{definition.label}</span>
              <span className={styles.source}>Saved by you</span>
            </header>
            <div className={styles.body}>
              {entry.kind === "context" ? (
                <>
                  <h3>{entry.context.sampleLabel || "Plant & sample"}</h3>
                  <p className={styles.species}>
                    {plants.find(
                      (plant) => plant.id === entry.context.speciesId,
                    )?.commonName ?? entry.context.speciesId}
                  </p>
                  <dl className={styles.sampleFacts}>
                    <div>
                      <dt>Tissue</dt>
                      <dd>{entry.context.tissue || "Not specified"}</dd>
                    </div>
                    <div>
                      <dt>Developmental stage</dt>
                      <dd>
                        {entry.context.developmentalStage || "Not specified"}
                      </dd>
                    </div>
                  </dl>
                  <details className={styles.sampleDetails}>
                    <summary>All sample details</summary>
                    <ContextDetails context={entry.context} plants={plants} />
                  </details>
                </>
              ) : (
                <ResearchEntryContent
                  entry={entry}
                  plants={plants}
                  markers={[]}
                />
              )}
            </div>
            <footer className={styles.footer}>
              <details>
                <summary>Saved record details</summary>
                <p>
                  Record <code>{entry.id}</code>
                </p>
                <time dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleString("en-GB", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
                <p>
                  This card shows the record used for this reply. Later edits
                  are saved separately.
                </p>
              </details>
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => onAsk(question)}
              >
                <WorkspaceIcon name="chat" size={15} /> Ask about this
              </button>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
