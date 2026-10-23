"use client";

import type { ScientificAction } from "@/app/core/analysis";
import styles from "./workspace.module.css";

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
            onClick={() => onRun(action)}
            disabled={disabled}
          >
            {action.label}
            <span aria-hidden="true"> →</span>
          </button>
        ))}
      </div>
    </section>
  );
}
