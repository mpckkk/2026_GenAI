"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import type { Project } from "@/app/core/types";
import type { ChatWorkspace } from "@/app/core/chat";
import type { ResearchWorkspace } from "@/app/core/research";
import type { PlantDefinition } from "@/app/core/plants";
import { AgentChat } from "./agent-chat";
import { ResearchPanel } from "./research-panel";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./workspace.module.css";

const query = "(max-width: 1180px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const compactSnapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export function ExperimentWorkspace({
  project,
  chat,
  research,
  plants,
  before,
}: {
  project: Project;
  chat: ChatWorkspace;
  research: ResearchWorkspace;
  plants: PlantDefinition[];
  before?: string;
}) {
  const compact = useSyncExternalStore(
    subscribe,
    compactSnapshot,
    serverSnapshot,
  );
  const [contextChoice, setContextChoice] = useState<boolean | null>(null);
  const contextVisible = contextChoice ?? !compact;
  const contextHeading = useRef<HTMLHeadingElement>(null);
  const context = research.context?.context;
  const plant = plants.find((item) => item.id === context?.speciesId);
  const contextLabel = context
    ? [plant?.commonName ?? context.speciesId, context.tissue]
        .filter(Boolean)
        .join(" · ")
    : "Add sample context";

  function openContext() {
    setContextChoice(true);
    window.requestAnimationFrame(() => contextHeading.current?.focus());
  }

  function closeContext() {
    setContextChoice(false);
    window.requestAnimationFrame(() =>
      document
        .getElementById("celloras-message")
        ?.focus({ preventScroll: true }),
    );
  }

  return (
    <div className={styles.experimentFrame}>
      <header className={styles.projectHeader}>
        <div className={styles.projectHeading}>
          <Link href="/app" className={styles.breadcrumb}>
            Experiments <span aria-hidden="true">/</span>
          </Link>
          <h1>{project.name}</h1>
        </div>
        <div className={styles.projectActions}>
          <span className={styles.savedState}>Experiment saved</span>
          <button
            type="button"
            className={styles.panelToggle}
            aria-controls="study-context"
            aria-expanded={contextVisible}
            onClick={() => setContextChoice(!contextVisible)}
          >
            <WorkspaceIcon name="panel" size={18} />
            <span>
              {compact && contextVisible ? "Back to chat" : "Study context"}
            </span>
          </button>
        </div>
      </header>
      <div className={styles.workbench} data-context-visible={contextVisible}>
        <div className={styles.chatPane}>
          <AgentChat
            projectId={project.id}
            initial={chat}
            contextLabel={contextLabel}
            onOpenContext={openContext}
          />
        </div>
        <aside
          id="study-context"
          className={styles.studyInspector}
          aria-label="Study context"
          hidden={!contextVisible}
        >
          <header className={styles.inspectorHeader}>
            <h2 tabIndex={-1} ref={contextHeading}>
              Study context
            </h2>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Close study context"
              onClick={closeContext}
            >
              <WorkspaceIcon name="close" size={17} />
            </button>
          </header>
          <ResearchPanel
            projectId={project.id}
            workspace={research}
            plants={plants}
            before={before}
          />
        </aside>
      </div>
    </div>
  );
}
