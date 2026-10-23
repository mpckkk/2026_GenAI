import { parseScientificAction } from "../core/analysis.mjs";
import "server-only";
import { randomUUID } from "node:crypto";
import type {
  ChatRepository,
  ChatTurn,
  ChatWorkspace,
  SubmitChatInput,
} from "@/app/core/chat";
import { ChatValidationError } from "@/app/core/chat";
import { logFailure } from "@/app/core/errors";
import type { AccessService } from "./access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value))
    throw new ChatValidationError({ [field]: "Use a valid identifier." });
  return value.toLowerCase();
}

function submitInput(input: unknown): SubmitChatInput {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ChatValidationError({
      entry: "Provide a valid chat submission.",
    });
  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) => !["submissionId", "prompt", "action"].includes(key),
    )
  )
    throw new ChatValidationError({
      entry: "This submission contains unsupported fields.",
    });
  const submissionId = uuid(value.submissionId, "submissionId");
  if (
    typeof value.prompt !== "string" ||
    !value.prompt.trim() ||
    value.prompt.length > 12000
  )
    throw new ChatValidationError({
      prompt: "Enter a prompt of 1–12000 characters.",
    });
  if (/\0|[\uD800-\uDFFF]/u.test(value.prompt))
    throw new ChatValidationError({
      prompt: "Remove invalid text characters.",
    });
  return {
    submissionId,
    prompt: value.prompt,
    ...(value.action === undefined
      ? {}
      : { action: parseScientificAction(value.action) }),
  };
}

function stage(
  operationId: string,
  event: string,
  detail: Record<string, string | number> = {},
) {
  // No researcher prompts, model output or runtime credentials in application logs.
  console.info(
    JSON.stringify({ event: `chat.${event}`, operationId, ...detail }),
  );
}

export class ChatService {
  constructor(
    private readonly access: AccessService,
    private readonly repository: ChatRepository,
  ) {}

  async workspace(
    userId: string,
    projectId: string,
    before?: string,
  ): Promise<ChatWorkspace> {
    await this.access.requireProject(userId, projectId);
    return this.repository.workspace(userId, projectId, before);
  }

  async submit(
    userId: string,
    projectId: string,
    input: unknown,
  ): Promise<ChatTurn> {
    const operationId = randomUUID();
    stage(operationId, "submit.started");
    try {
      await this.access.requireProject(userId, projectId);
      const parsed = submitInput(input);
      stage(operationId, "submit.validated");
      const saved = await this.repository.submit(userId, projectId, parsed);
      stage(operationId, "submit.committed", {
        position: saved.position,
        status: saved.status,
      });
      return saved;
    } catch (error) {
      logFailure(`chat.submit.failed.${operationId}`, error);
      throw error;
    }
  }

  async cancel(
    userId: string,
    projectId: string,
    turnId: unknown,
  ): Promise<ChatTurn> {
    const operationId = randomUUID();
    stage(operationId, "cancel.started");
    try {
      await this.access.requireProject(userId, projectId);
      const saved = await this.repository.cancel(
        userId,
        projectId,
        uuid(turnId, "turnId"),
      );
      stage(operationId, "cancel.committed", {
        position: saved.position,
        status: saved.status,
      });
      return saved;
    } catch (error) {
      logFailure(`chat.cancel.failed.${operationId}`, error);
      throw error;
    }
  }
}
