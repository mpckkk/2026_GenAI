export type ChatStatus =
  "queued" | "running" | "completed" | "failed" | "cancelled";

export interface ChatTurn {
  id: string;
  submissionId: string;
  position: string;
  prompt: string;
  action?: import("./analysis").ScientificAction | null;
  response: string | null;
  responseDocument: ResponseDocument | null;
  recalledDecisions?: Array<{
    source: string;
    href: string;
    savedAt: string;
    content: string;
  }>;
  status: ChatStatus;
  progress: string;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRuntime {
  status: "ready" | "unavailable";
  detail: string;
}

export interface ChatWorkspace {
  evidenceReviews: Record<string, import("./evidence").EvidenceReviewReceipt>;
  turns: ChatTurn[];
  nextBefore: string | null;
  runtime: ChatRuntime;
}

export interface SubmitChatInput {
  submissionId: string;
  prompt: string;
  action?: import("./analysis").ScientificAction;
}

/** Execution boundary implemented by worker-side provider adapters. */
export interface AgentRuntime {
  health(): Promise<void>;
  run(input: {
    name: string;
    prompt: string;
    signal?: AbortSignal;
    progress: (message: string) => void;
  }): Promise<AgentResponse>;
  remove(name: string): Promise<void>;
}

/** Durable queue boundary. Workers own inference and status transitions. */
export interface ChatRepository {
  workspace(
    userId: string,
    projectId: string,
    before?: string,
  ): Promise<ChatWorkspace>;
  submit(
    userId: string,
    projectId: string,
    input: SubmitChatInput,
  ): Promise<ChatTurn>;
  cancel(userId: string, projectId: string, turnId: string): Promise<ChatTurn>;
}

export class ChatValidationError extends Error {
  constructor(public readonly fields: Record<string, string>) {
    super("Check the chat fields and try again.");
    this.name = "ChatValidationError";
  }
}

export class ChatSubmissionConflictError extends Error {
  constructor() {
    super("This submission was already saved with a different prompt.");
    this.name = "ChatSubmissionConflictError";
  }
}

export class ChatActiveTurnError extends Error {
  constructor() {
    super(
      "Wait for the active turn to finish or cancel it before sending another prompt.",
    );
    this.name = "ChatActiveTurnError";
  }
}

export class ChatRuntimeUnavailableError extends Error {
  constructor() {
    super("The agent worker is unavailable. Your prompt has not been queued.");
    this.name = "ChatRuntimeUnavailableError";
  }
}

export class ChatCleanupPendingError extends Error {
  constructor() {
    super(
      "The previous agent execution is still stopping. Your prompt has not been queued; try again shortly.",
    );
    this.name = "ChatCleanupPendingError";
  }
}

export class ChatTurnNotFoundError extends Error {
  constructor() {
    super("Chat turn not found.");
    this.name = "ChatTurnNotFoundError";
  }
}
import type { AgentResponse, ResponseDocument } from "./agent-response.mjs";
