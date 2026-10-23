"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./experiments.module.css";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function GuidedStart() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady,
  );
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
    <section className={styles.demo} aria-labelledby="guided-start-heading">
      <span className={styles.demoIcon}>
        <WorkspaceIcon name="leaf" size={22} />
      </span>
      <div className={styles.demoCopy}>
        <h2 id="guided-start-heading">Try the soybean demo</h2>
        <p>Explore real cell groups, marker genes and their evidence.</p>
      </div>
      <button
        type="button"
        className={styles.demoButton}
        aria-label="Explore soybean root demo"
        onClick={() => void start()}
        disabled={!hydrated || pending}
      >
        {pending ? "Opening…" : "Open demo"}
        {!pending && <WorkspaceIcon name="chevron" size={15} />}
      </button>
      {error && (
        <div className={styles.demoError} role="alert">
          <p>{error}</p>
          <p>Retry to open the same saved demo.</p>
        </div>
      )}
      {pending && (
        <p className={styles.demoStatus} role="status">
          Opening your saved workspace…
        </p>
      )}
    </section>
  );
}
