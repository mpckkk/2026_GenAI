import "server-only";
import { Pool } from "pg";

const state = globalThis as typeof globalThis & { cellorasPool?: Pool };
export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!state.cellorasPool) {
    state.cellorasPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
    });
    state.cellorasPool.on("error", () =>
      console.error(JSON.stringify({ event: "database.pool.error" })),
    );
  }
  return state.cellorasPool;
}
