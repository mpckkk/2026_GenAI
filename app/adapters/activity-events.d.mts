import type { Pool, PoolClient } from "pg";
import type {
  ActivityData,
  ActivityKind,
  ActivityPhase,
} from "../core/activity";
export class ActivityWriteError extends Error {
  readonly code: string;
  constructor(code: string);
}
export function validateActivityData(value?: unknown): ActivityData;
export function appendActivity(
  connection: Pool | PoolClient,
  event: {
    ownerId: string;
    projectId: string;
    turnId: string;
    spanId: string;
    parentSpanId?: string | null;
    kind: ActivityKind;
    phase: ActivityPhase;
    name: string;
    summary: string;
    data?: ActivityData;
  },
): Promise<{ id: string; position: string; created_at: Date }>;
