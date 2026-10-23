"use client";

import type { ScientificAction } from "@/app/core/analysis";
import styles from "./workspace.module.css";

export interface GuidedAction {
  label: string;
  prompt: string;
  action?: ScientificAction;
}

export function NextActions({
  heading = "Suggested next step",
  description,
  actions,
  onRun,
  disabled,
}: {
  heading?: string;
  description: string;
  actions: GuidedAction[];
  onRun: (action: GuidedAction) => void;
  disabled: boolean;
}) {
  if (!actions.length) return null;
  return (
    <section className={styles.nextActions} aria-label="Suggested next actions">
      <h3>{heading}</h3>
      <p>{description}</p>
      <div>
        {actions.map((action, index) => (
          <button
            type="button"
            key={action.label}
            className={index === 0 ? styles.nextPrimary : styles.nextSecondary}
            onClick={() => onRun(action)}
            disabled={disabled}
          >
            {action.label}
            <span aria-hidden="true"> →</span>
          </button>
        ))}
      </div>
      <small>Runs in this conversation. Or ask your own question below.</small>
    </section>
  );
}
