import "server-only";
import type { AnalysisRepository } from "../core/analysis";
import type { AccessService } from "./access";

export class AnalysisService {
  constructor(
    private readonly access: AccessService,
    private readonly repository: AnalysisRepository,
  ) {}
  async workspace(userId: string, projectId: string) {
    await this.access.requireProject(userId, projectId);
    return this.repository.workspace(userId, projectId);
  }
  startDemo(userId: string) {
    return this.repository.startDemo(userId);
  }
  async get(userId: string, projectId: string, runId: string) {
    await this.access.requireProject(userId, projectId);
    return this.repository.get(userId, projectId, runId);
  }
  async review(
    userId: string,
    projectId: string,
    runId: string,
    input: unknown,
  ) {
    await this.access.requireProject(userId, projectId);
    return this.repository.review(userId, projectId, runId, input);
  }
  async reviewAnnotation(
    userId: string,
    projectId: string,
    runId: string,
    input: unknown,
  ) {
    await this.access.requireProject(userId, projectId);
    return this.repository.reviewAnnotation(userId, projectId, runId, input);
  }
}
