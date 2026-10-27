"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { ChatTurn, ChatWorkspace } from "@/app/core/chat";
import { BrandMark } from "@/app/components/brand";
import { MarkdownMessage } from "@/app/components/markdown-message";
import type { PlantDefinition } from "@/app/core/plants";
import type { ScientificAction } from "@/app/core/analysis";
import type {
  ScientificDataset,
  ScientificResult,
} from "@/app/core/scientific-data";
import { AgentResponse } from "./agent-response";
import { NextActions, type GuidedAction } from "./next-actions";
import { MarkerUpload } from "./marker-upload";
import type { ScientificSelection } from "./scientific-card";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./workspace.module.css";
import activityStyles from "./activity/activity.module.css";

type RequestError = { message: string; code?: string; operation: string };
type Attempt = {
  submissionId: string;
  prompt: string;
  action?: ScientificAction;
};

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
    case "investigation_unconfigured":
    case "nightshift_no_provider":
    case "nightshift_no_ready_lane":
      return "Evidence review needs a connected model in Nightshift. Your original annotation is unchanged.";
    case "investigation_submission_unknown":
    case "investigation_already_submitted":
    case "investigation_cleanup_required":
      return "A review job may still exist for this group. Check its activity before trying again; Celloras will not submit a duplicate automatically.";
    case "investigation_insufficient_candidates":
    case "investigation_no_distinguishing_markers":
      return "The reference does not provide enough distinct marker evidence for this comparison. Keep the group unresolved and inspect its genes or add research context.";
    case "investigation_dataset_changed":
    case "investigation_source_unavailable":
    case "investigation_reference_changed":
      return "The saved annotation no longer matches the attached data or reference. Run a new annotation before investigating this group.";
    case "investigation_invalid_response":
    case "investigation_incomplete":
      return "The review did not return three complete interpretations with valid evidence references. No new label was saved.";
    case "investigation_timeout":
      return "The evidence review reached its time limit and was stopped. Your original annotation is unchanged.";
    case "agent_timeout":
      return "The agent reached its time limit. You can retry with a more focused question.";
    case "agent_execution_failed":
      return "The agent could not complete this response. Your message is saved; you can retry.";
    case "agent_output_limit":
      return "The response reached its output limit. Try a shorter or more focused request.";
    case "marker_reference_unavailable":
      return "The published marker reference is unavailable. No evidence was substituted; check service status.";
    case "agent_tool_limit":
      return "The agent reached this response’s tool limit. Try one analysis or question at a time.";
    case "scientific_data_unavailable":
      return "The dataset service could not complete this analysis. Your data and earlier results remain saved; check service status before retrying.";
    case "scientific_input_invalid":
      return "This analysis needs a valid source cluster or gene selection. Choose a group on the cell map or a gene in the marker table, then try again.";
    case "scientific_gene_missing":
      return "The requested gene was not found in this dataset. Select a gene from its marker table, or check the exact gene ID and genome build.";
    case "annotation_reference_incompatible":
      return "This dataset’s tissue or genome build does not match the available annotation reference (soybean root, Wm82v4). You can explore the cell map and gene expression; cell-type suggestions need a compatible reference.";
    case "analysis_unavailable":
      return "This saved analysis is unavailable to this conversation. Open the dataset overview and start a new analysis.";
    case "literature_unavailable":
      return "The literature collection could not be searched. Your scientific results remain saved; check service status before retrying.";
    case "agent_response_invalid":
      return "The agent returned a response format we could not display. Please retry.";
    case "agent_card_unavailable":
      return "The agent referenced a saved record that is unavailable for this conversation. Please retry or check your study context.";
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
  contextLabel,
  onOpenContext,
  plants,
  science,
}: {
  projectId: string;
  initial: ChatWorkspace;
  contextLabel: string;
  onOpenContext: () => void;
  plants: PlantDefinition[];
  science: {
    dataset: ScientificDataset | null;
    available: boolean;
    reason?: string;
  };
}) {
  const endpoint = `/api/projects/${projectId}/chat`;
  const [reviews, setReviews] = useState(initial.evidenceReviews);
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
  const [selection, setSelection] = useState<ScientificSelection | null>(() => {
    const previous = initial.turns.findLast(
      (turn) =>
        ["markers", "annotation"].includes(turn.action?.operation ?? "") &&
        turn.action?.datasetId === science.dataset?.id,
    );
    return previous?.action?.cluster
      ? {
          datasetId: previous.action.datasetId,
          cluster: previous.action.cluster,
        }
      : null;
  });
  const [latestScience, setLatestScience] = useState<ScientificResult | null>(
    null,
  );
  const attempts = useRef<Record<string, Attempt>>({});
  const postingRef = useRef(false);
  const selectionRestoredRef = useRef(false);
  const refreshingRef = useRef(false);
  const loadedOlderRef = useRef(false);
  const mountedRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const linkedTurnRef = useRef<string | null>(null);
  const prependedHeightRef = useRef<number | null>(null);
  const activeTurn = turns.find(isActive);
  const canSend =
    !posting &&
    (!activeTurn || activeTurn.submissionId === draftSubmissionId) &&
    (runtime.status === "ready" || Boolean(draftSubmissionId));
  const canRun =
    !posting && !activeTurn && !draftSubmissionId && runtime.status === "ready";

  function selectScience(next: ScientificSelection) {
    selectionRestoredRef.current = true;
    setSelection(next);
    try {
      window.sessionStorage.setItem(
        `celloras:selection:${projectId}`,
        JSON.stringify(next),
      );
    } catch {
      /* Selection remains usable when browser storage is disabled. */
    }
  }

  const scientificLoaded = useCallback(
    (result: ScientificResult) => {
      setLatestScience((current) =>
        !current || result.generatedAt > current.generatedAt ? result : current,
      );
      if (result.operation !== "inspect") return;
      let restored: ScientificSelection | null = null;
      if (!selectionRestoredRef.current) {
        try {
          const saved = JSON.parse(
            window.sessionStorage.getItem(`celloras:selection:${projectId}`) ||
              "null",
          );
          if (
            saved?.datasetId === result.dataset.id &&
            (saved.cluster === null ||
              result.payload.clusters.some(
                (cluster) => cluster.id === saved.cluster,
              ))
          )
            restored = { datasetId: result.dataset.id, cluster: saved.cluster };
        } catch {
          /* A browser preference never supplies scientific data. */
        }
      }
      selectionRestoredRef.current = true;
      setSelection(
        (current) =>
          restored ??
          (current?.datasetId === result.dataset.id &&
          (current.cluster === null ||
            result.payload.clusters.some(
              (cluster) => cluster.id === current.cluster,
            ))
            ? current
            : { datasetId: result.dataset.id, cluster: null }),
      );
    },
    [projectId],
  );

  function askAboutCard(question: string) {
    if (postingRef.current || draftSubmissionId) return;
    const next = draft.trim() ? `${draft}\n\n${question}` : question;
    if (next.length > 12000) {
      setRequestError({
        operation: "draft",
        message: "Shorten your draft before adding this question.",
      });
      return;
    }
    setDraft(next);
    inputRef.current?.focus();
  }

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
      setReviews((current) => ({ ...current, ...workspace.evidenceReviews }));
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

  useLayoutEffect(() => {
    const id = window.location.hash.slice(1);
    if (id.startsWith("turn-")) {
      const target = document.getElementById(id);
      if (target) {
        followingRef.current = false;
        linkedTurnRef.current = id;
      }
    }
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (prependedHeightRef.current !== null) {
      scroller.scrollTop += scroller.scrollHeight - prependedHeightRef.current;
      prependedHeightRef.current = null;
    } else if (followingRef.current) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [turns]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // Compact mode initially hides the chat while the media query hydrates.
    // Follow new messages only after the pane has a real viewport size.
    const observer = new ResizeObserver(() => {
      if (scroller.clientHeight <= 0) return;
      if (linkedTurnRef.current) {
        document
          .getElementById(linkedTurnRef.current)
          ?.scrollIntoView({ block: "start" });
        linkedTurnRef.current = null;
      } else if (followingRef.current) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  async function sendPrompt(
    prompt: string,
    operation: string,
    asNew = false,
    action?: ScientificAction,
  ) {
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
      attempts.current[operation] = { submissionId, prompt, action };
      if (operation === "draft") setDraftSubmissionId(submissionId);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          prompt,
          ...(action ? { action } : {}),
        }),
      });
      if (!response.ok) {
        setRequestError(await responseError(response, operation));
        void refresh();
        return;
      }
      const turn: ChatTurn = await response.json();
      if (!turn.id || !turn.status)
        throw new Error("The accepted message could not be read.");
      followingRef.current = true;
      setTurns((current) => mergeTurns(current, [turn]));
      delete attempts.current[operation];
      if (operation === "draft") {
        setDraft("");
        setDraftSubmissionId(null);
      }
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

  function runAction(suggestion: GuidedAction) {
    if (!canRun || (suggestion.action && !science.available)) return;
    if (suggestion.action?.cluster)
      selectScience({
        datasetId: suggestion.action.datasetId,
        cluster: suggestion.action.cluster,
      });
    const operation = `suggestion:${JSON.stringify(suggestion.action ?? suggestion.prompt)}`;
    void sendPrompt(suggestion.prompt, operation, false, suggestion.action);
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
    const prompt = selection?.cluster
      ? `${draft}\n\nSelected source cluster: ${selection.cluster} in ${science.dataset?.title || "dataset"} (${selection.datasetId}).`
      : draft;
    if (prompt.length > 12000) {
      setRequestError({
        operation: "draft",
        message:
          "Shorten your message slightly so the selected dataset and cluster can be included.",
      });
      return;
    }
    void sendPrompt(prompt, "draft", asNew);
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
      prependedHeightRef.current = scrollRef.current?.scrollHeight ?? null;
      followingRef.current = false;
      setTurns((current) => mergeTurns(current, workspace.turns));
      setNextBefore(workspace.nextBefore);
      setReviews((current) => ({ ...current, ...workspace.evidenceReviews }));
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
    {
      label: "Plan an experiment",
      prompt: "What context should I record for soybean single-cell data?",
      icon: "flask" as const,
    },
    {
      label: "Find marker evidence",
      prompt:
        "Look up published evidence for my saved soybean markers. Show candidate cell types and the supporting genes, or explain what context is missing.",
      icon: "leaf" as const,
    },
    {
      label: "Review an interpretation",
      prompt:
        "What are the limits of assigning a cell type from markers alone?",
      icon: "chat" as const,
    },
  ];
  const dataset = science.dataset;
  const annotationCompatible =
    dataset?.speciesId === "glycine-max" &&
    dataset.tissue === "root" &&
    dataset.genomeBuild === "Wm82v4";
  const cluster =
    selection?.datasetId === dataset?.id ? selection?.cluster : null;
  let nextDescription =
    "Start with your cell map. Then choose a group to investigate its genes.";
  let nextActions: GuidedAction[] = dataset
    ? [
        {
          label: "Explore cell groups",
          prompt: `Show the saved UMAP and cell groups for ${dataset.title}. Help me choose a group to investigate and distinguish existing group IDs from biological annotations.`,
          action: { operation: "inspect", datasetId: dataset.id },
        },
      ]
    : [];
  if (dataset && latestScience?.dataset.id === dataset.id) {
    const genes =
      latestScience.operation === "markers"
        ? latestScience.payload.markers.slice(0, 6).map((gene) => gene.geneId)
        : latestScience.operation === "expression"
          ? [latestScience.payload.gene.geneId]
          : latestScience.operation === "dotplot"
            ? latestScience.payload.genes.map((gene) => gene.geneId)
            : [];
    const literature: GuidedAction = {
      label: "Find papers",
      prompt: `Find compatible published evidence for this ${dataset.species} ${dataset.tissue} analysis${cluster ? ` of source cluster ${cluster}` : ""}${genes.length ? ` and genes ${genes.join(", ")}` : ""}. Distinguish study context from evidence supporting a cell identity, and explain gaps.`,
      action: {
        operation: "literature",
        datasetId: dataset.id,
        ...(genes.length ? { genes } : {}),
        query: genes.length
          ? `${dataset.species} ${dataset.tissue} markers annotation ${genes.join(" ")}`
          : `${dataset.species} ${dataset.tissue} single cell atlas annotation methods`,
      },
    };
    if (latestScience.operation === "dotplot") {
      nextDescription =
        "Now check what the literature actually supports. Evidence may remain insufficient for a cell-type label.";
      nextActions = [literature];
    } else if (
      (latestScience.operation === "markers" &&
        (!cluster || cluster === latestScience.payload.cluster)) ||
      latestScience.operation === "expression"
    ) {
      nextDescription =
        "Check whether these genes are specific to one group, then compare the result with published evidence.";
      nextActions = genes.length
        ? [
            {
              label:
                latestScience.operation === "expression"
                  ? "Compare this gene"
                  : "Compare top genes",
              prompt: `Show a dot plot of ${genes.join(", ")} across the source clusters in ${dataset.title}. Explain detection and expression without assigning an unsupported cell type.`,
              action: { operation: "dotplot", datasetId: dataset.id, genes },
            },
            literature,
          ]
        : [literature];
    } else if (cluster) {
      nextDescription = `Cluster ${cluster} is selected. Find genes enriched in this group before exploring possible identities.`;
      nextActions = [
        {
          label: "Find markers",
          prompt: `Find genes enriched in source cluster ${cluster} of ${dataset.title}. Explain the comparison and limits; do not assign a cell identity without evidence.`,
          action: { operation: "markers", datasetId: dataset.id, cluster },
        },
        literature,
      ];
    } else {
      const largest =
        latestScience.operation === "inspect"
          ? [...latestScience.payload.clusters].sort(
              (a, b) => b.nCells - a.nCells,
            )[0]
          : null;
      nextDescription = largest
        ? `Start with cluster ${largest.id}, the largest group (${largest.nCells.toLocaleString("en-GB")} nuclei), or choose another group on the cell map.`
        : "Choose a cluster on the cell map or with its numbered buttons. We’ll keep that selection for your next analysis.";
      nextActions = largest
        ? [
            {
              label: `Explore group ${largest.id}`,
              prompt: `Find genes enriched in source cluster ${largest.id} of ${dataset.title}. Explain the comparison and limits; do not assign a cell identity without evidence.`,
              action: {
                operation: "markers",
                datasetId: dataset.id,
                cluster: largest.id,
              },
            },
            literature,
          ]
        : [literature];
    }
  }
  const latestAnswer = turns.findLast((turn) => turn.status === "completed");
  if (
    latestAnswer?.responseDocument?.blocks.some(
      (block) => block.type === "literature_result",
    )
  ) {
    nextActions = [];
  }
  if (
    dataset &&
    annotationCompatible &&
    !latestAnswer?.responseDocument?.blocks.some(
      (block) => block.type === "annotation_result",
    )
  ) {
    const annotationAction: GuidedAction = {
      label: cluster ? "Annotate group" : "Annotate all groups",
      prompt: `Annotate ${cluster ? `source cluster ${cluster}` : "all source clusters"} in ${dataset.title} using the compatible published marker reference. Show candidate cell types, supporting and conflicting genes, uncertainty and citations. Keep unresolved groups explicit and leave final label decisions to me.`,
      action: {
        operation: "annotation",
        datasetId: dataset.id,
        ...(cluster ? { cluster } : {}),
      },
    };
    nextActions = [annotationAction, ...nextActions].slice(0, 3);
    nextDescription = cluster
      ? `Get evidence-backed cell-type candidates for cluster ${cluster}, then review the genes and decide on a label.`
      : "Start with cell-type candidates for the soybean root groups, or explore the cell map first.";
  }

  return (
    <section className={styles.agentChat} aria-labelledby="agent-chat-heading">
      <header className={styles.chatHeading}>
        <h2 id="agent-chat-heading">Conversation</h2>
        <span
          className={styles.agentStatus}
          data-ready={runtime.status === "ready"}
        >
          <span aria-hidden="true" />
          {runtime.status === "ready" ? "Agent connected" : "Agent unavailable"}
        </span>
      </header>
      <div
        className={styles.chatScroll}
        ref={scrollRef}
        tabIndex={0}
        aria-label="Conversation messages"
        onScroll={(event) => {
          const element = event.currentTarget;
          // A reader can scroll upward even when the whole overflow is short.
          // Follow only at the bottom, allowing one pixel for layout rounding.
          followingRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 1;
        }}
      >
        <div className={styles.chatContent} data-empty={turns.length === 0}>
          {runtime.status === "unavailable" && (
            <div className={styles.chatNotice} role="status">
              {runtime.detail} <a href="/app/health">Check service status</a>
            </div>
          )}
          {!science.available && science.reason && (
            <div className={styles.chatNotice} role="status">
              {science.reason ||
                "The dataset service is currently unavailable."}{" "}
              Earlier results remain saved.{" "}
              <a href="/app/health">Check service status</a>
            </div>
          )}
          {dataset && !annotationCompatible && (
            <div className={styles.chatNotice} role="status">
              Your cell map and gene expression are ready to explore. Cell-type
              annotation currently requires soybean root data with genome build
              Wm82v4; this dataset is {dataset.tissue}, {dataset.genomeBuild}.
            </div>
          )}
          {pollError && (
            <div className={styles.chatNotice} role="alert">
              <p>
                Live updates could not be refreshed. {pollError} Updates will
                retry automatically.
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
                  id={`turn-${turn.id}`}
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
                      <BrandMark size={30} />
                      <div className={styles.assistantContent}>
                        <p className={styles.chatSpeaker}>Celloras</p>
                        {!!turn.recalledDecisions?.length && (
                          <details className={styles.memoryReceipt}>
                            <summary>
                              Recalled {turn.recalledDecisions.length} saved{" "}
                              {turn.recalledDecisions.length === 1
                                ? "decision"
                                : "decisions"}
                            </summary>
                            <p>
                              Your previous reviews in this experiment, recalled
                              by H-MEM.
                            </p>
                            <ul>
                              {turn.recalledDecisions.map((decision) => {
                                const value = JSON.parse(decision.content) as {
                                  cellType?: string;
                                  cluster?: string;
                                  markerSet?: string;
                                  decision?: string;
                                  note?: string;
                                };
                                return (
                                  <li key={decision.source}>
                                    <a href={decision.href}>
                                      {value.cellType ||
                                        value.decision ||
                                        "Saved review"}
                                      {value.cluster
                                        ? ` · group ${value.cluster}`
                                        : value.markerSet
                                          ? ` · ${value.markerSet}`
                                          : ""}
                                    </a>
                                    {value.note && <p>{value.note}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </details>
                        )}
                        {turn.responseDocument ? (
                          <AgentResponse
                            document={turn.responseDocument}
                            reviews={reviews}
                            plants={plants}
                            onAsk={askAboutCard}
                            actionsDisabled={
                              posting || Boolean(draftSubmissionId)
                            }
                            selection={selection}
                            onSelect={selectScience}
                            onRun={runAction}
                            onScientificLoaded={scientificLoaded}
                            scientificActionsDisabled={
                              !canRun || !science.available
                            }
                          />
                        ) : (
                          <MarkdownMessage>{turn.response}</MarkdownMessage>
                        )}
                      </div>
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
                          <a
                            className={styles.chatStatusLink}
                            href="/app/health"
                          >
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
                            void sendPrompt(
                              turn.prompt,
                              `retry:${turn.id}`,
                              false,
                              turn.action ?? undefined,
                            );
                          }}
                        >
                          Retry message
                        </button>
                      )}
                    </div>
                  )}
                  <Link
                    href={`/app/activity/${turn.id}`}
                    className={activityStyles.chatActivity}
                    aria-label={`View activity for: ${turn.prompt.slice(0, 100)}`}
                  >
                    <WorkspaceIcon name="activity" size={13} />
                    View activity
                    <WorkspaceIcon name="chevron" size={11} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.chatWelcome}>
              <BrandMark size={44} />
              <p className={styles.welcomeEyebrow}>
                Your research, in conversation
              </p>
              <h3>
                {dataset
                  ? "Your cells are ready to explore."
                  : "Start with your cells."}
              </h3>
              <p>
                {dataset
                  ? "Explore the cell map or ask Celloras to suggest cell types. Each result brings the measurements and evidence into this conversation."
                  : "Add a single-cell dataset to see your cell map and investigate what each group could be. You can also bring a marker list or ask a research question."}
              </p>
              {!dataset && (
                <div className={styles.chatSuggestions}>
                  <Link
                    href={`/app/upload?projectId=${projectId}`}
                    className={styles.datasetStart}
                  >
                    <WorkspaceIcon name="plus" size={18} />
                    <span>
                      Add dataset <small>· .h5ad</small>
                    </span>
                    <WorkspaceIcon name="chevron" size={15} />
                  </Link>
                  <button type="button" onClick={onOpenContext}>
                    <WorkspaceIcon name="plus" size={18} />
                    <span>Add sample context</span>
                    <WorkspaceIcon name="chevron" size={15} />
                  </button>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      disabled={posting || Boolean(draftSubmissionId)}
                      onClick={() => {
                        askAboutCard(suggestion.prompt);
                      }}
                    >
                      <WorkspaceIcon name={suggestion.icon} size={18} />
                      <span>
                        {suggestion.label} <small>· Draft a question</small>
                      </span>
                      <WorkspaceIcon name="chevron" size={15} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={styles.composerDock}>
        {dataset && (
          <NextActions
            description={nextDescription}
            actions={nextActions}
            onRun={runAction}
            disabled={!canRun || !science.available}
          />
        )}
        <form
          onSubmit={submit}
          className={styles.chatComposer}
          aria-label="Message the agent"
          aria-busy={posting}
        >
          <div className={styles.field}>
            <label htmlFor="celloras-message" className={styles.srOnly}>
              Message Celloras
            </label>
            <textarea
              ref={inputRef}
              id="celloras-message"
              name="prompt"
              rows={2}
              required
              maxLength={12000}
              value={draft}
              disabled={posting}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={inputKeyDown}
              aria-describedby="chat-input-help"
              placeholder={
                cluster
                  ? `Ask about group ${cluster}, or choose a suggested step…`
                  : "Ask a question, or choose a suggested step…"
              }
            />
          </div>
          {requestError && (
            <div className={styles.errorBox} role="alert">
              <p>{requestError.message}</p>
              {requestError.operation.startsWith("suggestion:") && (
                <button
                  type="button"
                  className={styles.chatSecondaryButton}
                  disabled={posting}
                  onClick={() => {
                    const attempt = attempts.current[requestError.operation];
                    if (attempt)
                      void sendPrompt(
                        attempt.prompt,
                        requestError.operation,
                        false,
                        attempt.action,
                      );
                  }}
                >
                  Retry suggested action
                </button>
              )}
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
          <div className={styles.chatComposerFooter}>
            <div className={styles.composerTools}>
              {!dataset && (
                <Link
                  className={styles.composerContext}
                  href={`/app/upload?projectId=${projectId}`}
                  title="Add a single-cell dataset"
                >
                  <WorkspaceIcon name="plus" size={16} />
                  <span>Add dataset</span>
                </Link>
              )}
              <MarkerUpload
                projectId={projectId}
                canAsk={canRun}
                onAsk={(prompt) =>
                  runAction({ label: "Find cell-type evidence", prompt })
                }
              />
              <button
                type="button"
                className={styles.composerContext}
                onClick={onOpenContext}
                aria-label="Open study context"
                title={dataset?.title || "Open study context"}
              >
                <WorkspaceIcon name="panel" size={16} />
                <span>{contextLabel}</span>
              </button>
              {dataset && cluster && (
                <button
                  type="button"
                  className={styles.clusterContext}
                  onClick={() =>
                    selectScience({ datasetId: dataset.id, cluster: null })
                  }
                  aria-label={`Clear selected cluster ${cluster}`}
                >
                  Group {cluster} ×
                </button>
              )}
            </div>
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!canSend || !draft.trim()}
              aria-label={posting ? "Sending…" : "Send message"}
              title="Send message"
            >
              <WorkspaceIcon name="arrow" size={20} />
            </button>
          </div>
        </form>
        <p id="chat-input-help" className={styles.srOnly}>
          {activeTurn
            ? "Let this response finish, or cancel it to send another message."
            : "Enter to send · Shift + Enter for a new line"}
        </p>
        <p className={styles.chatScope}>Interpretations need your review.</p>
      </div>
    </section>
  );
}
