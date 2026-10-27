import type { AgentRuntime } from "../core/chat";
export class NightshiftError extends Error {
  code: string;
  status?: number;
}
export class NightshiftClient {
  request(
    path: string,
    options?: { body?: unknown; signal?: AbortSignal; timeout?: number },
  ): Promise<Record<string, unknown>>;
  health: AgentRuntime["health"];
}
export class NightshiftAgent extends NightshiftClient implements AgentRuntime {
  lastReceipt: {
    provider: string;
    route: string;
    returnedModel: string | null;
    completedAt: string;
  } | null;
  health: AgentRuntime["health"];
  run: AgentRuntime["run"];
  remove: AgentRuntime["remove"];
}
