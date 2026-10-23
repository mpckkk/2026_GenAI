import "server-only";
import type { Projects } from "@/app/core/projects";
import type { Project } from "@/app/core/types";
import { database } from "./database";

type Row = { id: string; name: string; created_at: Date };
const project = (row: Row): Project => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at.toISOString(),
});
export class PostgresProjects implements Projects {
  async list(userId: string) {
    const result = await database().query<Row>(
      "SELECT id, name, created_at FROM projects WHERE owner_id=$1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows.map(project);
  }
  async create(userId: string, name: string) {
    name = name.trim();
    if (!name || name.length > 120)
      throw new Error("Project name must contain 1–120 characters");
    const result = await database().query<Row>(
      "INSERT INTO projects (owner_id, name) VALUES ($1, $2) RETURNING id, name, created_at",
      [userId, name],
    );
    return project(result.rows[0]);
  }
  async findOwned(userId: string, projectId: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        projectId,
      )
    )
      return null;
    const result = await database().query<Row>(
      "SELECT id, name, created_at FROM projects WHERE id=$1 AND owner_id=$2",
      [projectId, userId],
    );
    return result.rows[0] ? project(result.rows[0]) : null;
  }
}
