"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { ChatTurn, ChatWorkspace } from "@/app/core/chat";
import styles from "./workspace.module.css";

type RequestError = { message: string; code?: string; operation: string };
type Attempt = { submissionId: string; prompt: string };

function mergeTurns(existing: ChatTurn[], incoming: ChatTurn[]): ChatTurn[] {
  const byId = new Map(existing.map((turn) => [turn.id, turn]));
  for (const turn of incoming) {
    const previous = byId.get(turn.id);
    const incomingRank =
      turn.status === "queued" ? 0 : turn.status === "running" ? 1 : 2;
    const previousRank =
      previous?.status === "queued"
        ? 0
        : previous?.status === "running"
          ? 1
          : 2;
    if (
      !previous ||
      turn.updatedAt > previous.updatedAt ||
      (turn.updatedAt === previous.updatedAt && incomingRank >= previousRank)
    )
      byId.set(turn.id, turn);
  }
  return [...byId.values()].sort((a, b) => {
    const left = BigInt(a.position);
    const right = BigInt(b.position);
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function isActive(turn: ChatTurn) {
  return turn.status === "queued" || turn.status === "running";
}

async function responseError(
  response: Response,
  operation: string,
): Promise<RequestError> {
  const body: unknown = await response.json().catch(() => null);
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    const fields =
      "fields" in body && body.fields && typeof body.fields === "object"
        ? Object.values(body.fields).filter(
            (value): value is string => typeof value === "string",
          )
        : [];
    return {
      message: [body.error, ...fields].join(" "),
      code:
        "code" in body && typeof body.code === "string" ? body.code : undefined,
      operation,
    };
  }
  return {
    message: "The request could not be confirmed. Please try again.",
    operation,
  };
}

function failedTurnMessage(code: string | null) {
  switch (code) {
    case "agent_timeout":
      return "The agent reached its time limit. You can retry with a more focused question.";
    case "agent_execution_failed":
      return "The agent could not complete this response. Your message is saved; you can retry.";
    case "agent_output_limit":
      return "The response reached its output limit. Try a shorter or more focused request.";
    case "runtime_unavailable":
      return "The agent runtime is unavailable. Check service status before retrying.";
    case "agent_login_expired":
      return "The agent connection needs to be signed in again. Check service status.";
    case "sandbox_cleanup_failed":
      return "The agent could not confirm cleanup. Check service status before starting another request.";
    case "worker_interrupted":
      return "The agent was interrupted. Check service status before retrying.";
    case "cancelled":
      return "The response was cancelled. Your message remains in this conversation.";
    default:
      return "The response could not be completed. Your message is saved.";
  }
}

function timeLabel(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function AgentChat({
  projectId,
  initial,
}: {
  projectId: string;
  initial: ChatWorkspace;
}) {
  const endpoint = `/api/projects/${projectId}/chat`;
  const [turns, setTurns] = useState(initial.turns);
  const [runtime, setRuntime] = useState(initial.runtime);
  const [nextBefore, setNextBefore] = useState(initial.nextBefore);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [draftSubmissionId, setDraftSubmissionId] = useState<string | null>(
    null,
  );
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [requestError, setRequestError] = useState<RequestError | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const attempts = useRef<Record<string, Attempt>>({});
  const postingRef = useRef(false);
  const refreshingRef = useRef(false);
  const loadedOlderRef = useRef(false);
  const mountedRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const activeTurn = turns.find(isActive);
  const canSend =
    !posting &&
    (!activeTurn || activeTurn.submissionId === draftSubmissionId) &&
    (runtime.status === "ready" || Boolean(draftSubmissionId));

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        const error = await responseError(response, "poll");
        throw new Error(error.message);
      }
      const workspace: ChatWorkspace = await response.json();
      if (!Array.isArray(workspace.turns) || !workspace.runtime)
        throw new Error("The conversation response was incomplete.");
      if (!mountedRef.current) return;
      setTurns((current) => mergeTurns(current, workspace.turns));
      setRuntime(workspace.runtime);
      if (!loadedOlderRef.current) setNextBefore(workspace.nextBefore);
      setPollError(null);
    } catch (error) {
      if (mountedRef.current)
        setPollError(
          error instanceof Error
            ? error.message
            : "Messages could not be refreshed.",
        );
    } finally {
      refreshingRef.current = false;
    }
  }, [endpoint]);

  useEffect(() => {
    mountedRef.current = true;
    const interval = window.setInterval(() => {
      void refresh();
    }, 1800);
    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function sendPrompt(prompt: string, operation: string, asNew = false) {
    if (postingRef.current || !prompt.trim()) return;
    const existing = attempts.current[operation];
    if (
      activeTurn &&
      (asNew || activeTurn.submissionId !== existing?.submissionId)
    )
      return;
    if (runtime.status !== "ready" && !existing) return;
    postingRef.current = true;
    setPosting(true);
    setRequestError(null);
    try {
      const submissionId =
        !asNew && existing ? existing.submissionId : crypto.randomUUID();
      // Retain the ID through lost replies. A changed prompt needs explicit conflict recovery.
      attempts.current[operation] = { submissionId, prompt };
      if (operation === "draft") setDraftSubmissionId(submissionId);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, prompt }),
      });
      if (!response.ok) {
        setRequestError(await responseError(response, operation));
        void refresh();
        return;
      }
      const turn: ChatTurn = await response.json();
      if (!turn.id || !turn.status)
        throw new Error("The accepted message could not be read.");
      setTurns((current) => mergeTurns(current, [turn]));
      delete attempts.current[operation];
      if (operation === "draft") {
        setDraft("");
        setDraftSubmissionId(null);
      }
      window.requestAnimationFrame(() =>
        latestRef.current?.scrollIntoView({ block: "nearest" }),
      );
    } catch {
      setRequestError({
        operation,
        message:
          "The message could not be confirmed. Your text is still here. Retry to check or complete the same send.",
      });
    } finally {
      postingRef.current = false;
      setPosting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const asNew =
      submitter instanceof HTMLButtonElement && submitter.name === "sendAsNew";
    if (
      asNew &&
      !(
        requestError?.code === "SUBMISSION_CONFLICT" &&
        requestError.operation === "draft"
      )
    )
      return;
    if (!canSend || (asNew && activeTurn)) return;
    void sendPrompt(draft, "draft", asNew);
  }

  function inputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (canSend) event.currentTarget.form?.requestSubmit();
    }
  }

  async function cancel(turnId: string) {
    if (cancelling) return;
    setCancelling(turnId);
    setRequestError(null);
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnId }),
      });
      if (!response.ok) {
        setRequestError(await responseError(response, "cancel"));
        return;
      }
      const turn: ChatTurn = await response.json();
      setTurns((current) => mergeTurns(current, [turn]));
    } catch {
      setRequestError({
        operation: "cancel",
        message:
          "Cancellation could not be confirmed. Refresh the conversation or try cancelling again.",
      });
    } finally {
      setCancelling(null);
      void refresh();
    }
  }

  async function loadOlder() {
    if (!nextBefore || loadingOlder) return;
    setLoadingOlder(true);
    setHistoryError(null);
    loadedOlderRef.current = true;
    try {
      const response = await fetch(
        `${endpoint}?before=${encodeURIComponent(nextBefore)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const error = await responseError(response, "history");
        throw new Error(error.message);
      }
      const workspace: ChatWorkspace = await response.json();
      setTurns((current) => mergeTurns(current, workspace.turns));
      setNextBefore(workspace.nextBefore);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Older messages could not be loaded.",
      );
    } finally {
      setLoadingOlder(false);
    }
  }

  const suggestions = [
    "What context should I record for soybean single-cell data?",
    "How should I assess a soybean cluster’s marker genes?",
    "What are the limits of assigning a cell type from markers alone?",
  ];

  return (
    <section className={styles.agentChat} aria-labelledby="agent-chat-heading">
      <header className={styles.chatHeading}>
        <div>
          <h2 id="agent-chat-heading">Chat with Celloras</h2>
          <p>Single-cell research, starting with soybean.</p>
        </div>
        <span className={styles.tag}>
          {runtime.status === "ready" ? "Agent connected" : "Agent unavailable"}
        </span>
      </header>
      <div className={styles.chatScope}>
        <p>
          Discuss your research with the agent. Reference lookup and
          evidence-backed cell annotation are not connected yet.
        </p>
        {runtime.status === "unavailable" && (
          <p role="status">{runtime.detail}</p>
        )}
      </div>
      {pollError && (
        <div className={styles.chatNotice} role="alert">
          <p>
            Live updates could not be refreshed. {pollError} Updates will retry
            automatically.
          </p>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              void refresh();
            }}
          >
            Refresh messages
          </button>
        </div>
      )}
      {nextBefore && (
        <button
          type="button"
          className={styles.chatOlderButton}
          onClick={() => {
            void loadOlder();
          }}
          disabled={loadingOlder}
        >
          {loadingOlder ? "Loading older messages…" : "Load older messages"}
        </button>
      )}
      {historyError && (
        <p role="alert" className={styles.errorText}>
          {historyError} Try loading older messages again.
        </p>
      )}
      {turns.length ? (
        <ol className={styles.chatTurns} aria-label="Agent conversation">
          {turns.map((turn) => (
            <li
              key={turn.id}
              data-chat-turn-id={turn.id}
              data-chat-status={turn.status}
            >
              <div className={styles.chatUserMessage} data-chat-role="user">
                <div className={styles.entryMeta}>
                  <span>You</span>
                  <time dateTime={turn.createdAt}>
                    {timeLabel(turn.createdAt)} UTC
                  </time>
                </div>
                <p className={styles.preservedText}>{turn.prompt}</p>
              </div>
              {turn.status === "completed" && turn.response ? (
                <article
                  className={styles.chatAssistantMessage}
                  data-chat-role="assistant"
                  aria-label="Celloras response"
                >
                  <p className={styles.chatSpeaker}>Celloras</p>
                  <p className={styles.preservedText}>{turn.response}</p>
                </article>
              ) : (
                <div className={styles.chatTurnStatus}>
                  <div role={isActive(turn) ? "status" : undefined}>
                    <strong>
                      {turn.status === "queued"
                        ? "Queued"
                        : turn.status === "running"
                          ? "Celloras is working"
                          : turn.status === "cancelled"
                            ? "Response cancelled"
                            : "Response unavailable"}
                    </strong>
                    <p>
                      {turn.status === "failed"
                        ? failedTurnMessage(turn.errorCode)
                        : turn.progress ||
                          (turn.status === "cancelled"
                            ? "Your message remains in this conversation."
                            : turn.status === "completed"
                              ? "The completed request did not contain a response."
                              : "Waiting for an update from the agent.")}
                    </p>
                    {turn.status === "failed" && (
                      <a className={styles.chatStatusLink} href="/app/health">
                        Check service status
                      </a>
                    )}
                  </div>
                  {isActive(turn) && (
                    <button
                      type="button"
                      className={styles.chatSecondaryButton}
                      disabled={cancelling === turn.id}
                      onClick={() => {
                        void cancel(turn.id);
                      }}
                    >
                      {cancelling === turn.id
                        ? "Cancelling…"
                        : "Cancel response"}
                    </button>
                  )}
                  {(turn.status === "failed" ||
                    turn.status === "cancelled") && (
                    <button
                      type="button"
                      className={styles.chatSecondaryButton}
                      disabled={
                        posting ||
                        Boolean(activeTurn) ||
                        runtime.status !== "ready"
                      }
                      onClick={() => {
                        void sendPrompt(turn.prompt, `retry:${turn.id}`);
                      }}
                    >
                      Retry message
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.chatWelcome}>
          <h3>What would you like to work through?</h3>
          <p>
            Ask a question about your soybean single-cell experiment, or start
            with one of these.
          </p>
          <div className={styles.chatSuggestions}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={posting}
                onClick={() => {
                  setDraft(suggestion);
                  inputRef.current?.focus();
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={latestRef} />
      <form
        onSubmit={submit}
        className={styles.chatComposer}
        aria-label="Message the agent"
        aria-busy={posting}
      >
        <div className={styles.field}>
          <label htmlFor="celloras-message">Message Celloras</label>
          <textarea
            ref={inputRef}
            id="celloras-message"
            name="prompt"
            rows={3}
            required
            maxLength={12000}
            value={draft}
            disabled={posting}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={inputKeyDown}
            aria-describedby="chat-input-help"
            placeholder="Ask about your single-cell research…"
          />
        </div>
        {requestError && (
          <div className={styles.errorBox} role="alert">
            <p>{requestError.message}</p>
            {requestError.code === "SUBMISSION_CONFLICT" &&
              requestError.operation === "draft" && (
                <div className={styles.reviewSection}>
                  <button
                    type="submit"
                    name="sendAsNew"
                    className={styles.chatSecondaryButton}
                    disabled={posting || Boolean(activeTurn)}
                  >
                    Send as a new message
                  </button>
                </div>
              )}
          </div>
        )}
        <div className={styles.composerFooter}>
          <p id="chat-input-help" className={styles.fieldHint}>
            {activeTurn
              ? "Let this response finish, or cancel it to send another message."
              : "Enter to send · Shift + Enter for a new line"}
          </p>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!canSend || !draft.trim()}
          >
            {posting ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </section>
  );
}
