import type { Projects } from "@/app/core/projects";
import { ProjectNotFoundError } from "@/app/core/errors";

export class AccessService {
  constructor(private readonly projects: Projects) {}
  async requireProject(userId: string, projectId: string) {
    const project = await this.projects.findOwned(userId, projectId);
    if (!project) throw new ProjectNotFoundError();
    return project;
  }
}
