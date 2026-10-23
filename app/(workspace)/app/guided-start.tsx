"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./workspace.module.css";

export function GuidedStart() {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session has expired. Sign in again, then open the demo."
            : typeof body.error === "string"
              ? body.error
              : "The demo could not be opened. Please try again.",
        );
      if (
        typeof body.projectId !== "string" ||
        body.url !== `/app/projects/${body.projectId}`
      )
        throw new Error(
          "The demo address could not be confirmed. Please try again.",
        );
      router.push(body.url);
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The demo could not be opened. Please try again.",
      );
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <section
      className={styles.guidedStart}
      aria-labelledby="guided-start-heading"
    >
      <div className={styles.guidedStartIcon}>
        <WorkspaceIcon name="leaf" size={24} />
      </div>
      <p className={styles.eyebrow}>Start with real data</p>
      <h2 id="guided-start-heading">Meet the cells in a soybean root.</h2>
      <p className={styles.guidedStartDescription}>
        Explore a published dataset, choose a cell group, and investigate its
        genes with Celloras. We’ll suggest the next step as you go.
      </p>
      <div className={styles.guidedStartFacts} aria-label="Demo dataset">
        <span>
          <strong>7,496</strong> nuclei
        </span>
        <span>
          <strong>12</strong> source clusters
        </span>
        <span>Existing UMAP</span>
      </div>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={() => void start()}
        disabled={pending}
      >
        {pending ? "Opening your soybean demo…" : "Explore soybean root demo"}
        {!pending && <span aria-hidden="true"> →</span>}
      </button>
      <p className={styles.guidedStartCaption}>
        Published research data · Your exploration is saved privately · No
        upload needed
      </p>
      {error && (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <p>
            Your existing experiments are unchanged. Retry to open the same
            demo.
          </p>
        </div>
      )}
      {pending && (
        <p className={styles.guidedStartCaption} role="status">
          Checking the dataset and opening your saved workspace.
        </p>
      )}
    </section>
  );
}
