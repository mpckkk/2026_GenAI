"use client";

import type { ScientificAction } from "@/app/core/analysis";
import { WorkspaceIcon, type IconName } from "./workspace-icons";
import styles from "./workspace.module.css";

const actionIcons: Record<ScientificAction["operation"], IconName> = {
  annotation: "label",
  markers: "search",
  literature: "book",
  inspect: "grid",
  expression: "activity",
  dotplot: "grid",
};

export interface GuidedAction {
  label: string;
  prompt: string;
  action?: ScientificAction;
}

export function NextActions({
  description,
  actions,
  onRun,
  disabled,
}: {
  description: string;
  actions: GuidedAction[];
  onRun: (action: GuidedAction) => void;
  disabled: boolean;
}) {
  if (!actions.length) return null;
  return (
    <section className={styles.nextActions} aria-label="Suggested next actions">
      <p className={styles.srOnly}>
        {description} Choose an action to run it in this conversation.
      </p>
      <div>
        {actions.map((action) => (
          <button
            type="button"
            key={action.label}
            className={styles.nextSuggestion}
            data-operation={action.action?.operation}
            onClick={() => onRun(action)}
            disabled={disabled}
          >
            <WorkspaceIcon
              name={
                action.action ? actionIcons[action.action.operation] : "chat"
              }
              size={16}
            />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
