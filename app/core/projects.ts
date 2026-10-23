import type { Project } from "./types";

export interface Projects {
  list(userId: string): Promise<Project[]>;
  create(userId: string, name: string): Promise<Project>;
  findOwned(userId: string, projectId: string): Promise<Project | null>;
}
