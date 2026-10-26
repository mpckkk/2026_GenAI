"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";
import { createProject } from "./actions";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./experiments.module.css";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const invalidName = "Enter a name with 1–120 characters.";

export function NewExperiment({ error }: { error?: string }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientReady,
    serverReady,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [edited, setEdited] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fieldError =
    localError ?? (error === "name" && !edited ? invalidName : null);

  const open = useCallback(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    input.current?.focus();
  }, []);

  useEffect(() => {
    const matchHash = () => {
      if (window.location.hash === "#create-experiment") open();
      else if (dialog.current?.open) dialog.current.close();
    };
    // Next's same-page hash links can use pushState without a hashchange event.
    // Keep the existing sidebar/mobile links working without changing navigation.
    const followCreateLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const target = new URL(link.href, window.location.href);
      if (
        target.origin === window.location.origin &&
        target.pathname === window.location.pathname &&
        target.hash === "#create-experiment"
      )
        open();
    };
    window.addEventListener("hashchange", matchHash);
    window.addEventListener("click", followCreateLink);
    matchHash();
    if (error === "name") open();
    return () => {
      window.removeEventListener("hashchange", matchHash);
      window.removeEventListener("click", followCreateLink);
    };
  }, [error, open]);

  const isPending = () =>
    Boolean(
      dialog.current?.querySelector('button[type="submit"][aria-busy="true"]'),
    );
  function close() {
    if (!isPending()) dialog.current?.close();
  }
  function closed() {
    if (window.location.hash === "#create-experiment")
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
  }

  return (
    <>
      <button
        className={styles.secondaryButton}
        type="button"
        onClick={open}
        disabled={!hydrated}
      >
        <WorkspaceIcon name="plus" size={17} /> New experiment
      </button>
      <dialog
        id="create-experiment"
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="create-heading"
        aria-describedby="create-description"
        onClose={closed}
        onCancel={(event) => {
          if (isPending()) event.preventDefault();
        }}
      >
        <form
          action={createProject}
          onSubmit={(event) => {
            if (isPending()) {
              event.preventDefault();
              return;
            }
            if (!name.trim() || name.trim().length > 120) {
              event.preventDefault();
              setLocalError(invalidName);
              input.current?.focus();
            }
          }}
        >
          <CreationFields
            name={name}
            inputRef={input}
            error={fieldError}
            onChange={(value) => {
              setName(value);
              setEdited(true);
              setLocalError(null);
            }}
            onClose={close}
          />
        </form>
      </dialog>
    </>
  );
}

function CreationFields({
  name,
  inputRef,
  error,
  onChange,
  onClose,
}: {
  name: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <div className={styles.dialogHeading}>
        <h2 id="create-heading">New experiment</h2>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close new experiment"
          onClick={onClose}
          disabled={pending}
        >
          <WorkspaceIcon name="close" size={20} />
        </button>
      </div>
      <p id="create-description">
        Start a conversation for your research. You can add a dataset or marker
        list inside the experiment.
      </p>
      <label className={styles.nameLabel} htmlFor="project-name">
        Experiment name
      </label>
      <input
        ref={inputRef}
        className={styles.nameInput}
        id="project-name"
        name="name"
        value={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Soybean root study"
        required
        maxLength={120}
        readOnly={pending}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? "name-error" : undefined}
      />
      {error && (
        <p id="name-error" role="alert" className={styles.fieldError}>
          {error}
        </p>
      )}
      <div className={styles.dialogActions}>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Creating…" : "Create experiment"}
        </button>
      </div>
    </>
  );
}
