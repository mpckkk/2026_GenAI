import type { AgentRuntime } from "../core/chat";
export class NightshiftError extends Error {
  code: string;
}
export class NightshiftAgent implements AgentRuntime {
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
