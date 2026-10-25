import "server-only";
import { ResearchMemory } from "./research-memory.mjs";
import { database } from "./database";
import type { Memory } from "../core/tools";
export class HmemMemory implements Memory {
  recall: Memory["recall"] = async (input) => {
    const connection = await database().connect();
    try {
      await connection.query("BEGIN");
      const result = await new ResearchMemory().recall(connection, input);
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  };
}
