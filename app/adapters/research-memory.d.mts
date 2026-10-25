import type { Pool, PoolClient } from "pg";
import type { MemoryRecall, MemoryRequest } from "../core/memory";
export const HMEM_COMMIT: string;
export class ResearchMemory {
  health(
    connection: Pool | PoolClient,
  ): Promise<{ engine: string; commit: string }>;
  recall(connection: PoolClient, input: MemoryRequest): Promise<MemoryRecall>;
}
