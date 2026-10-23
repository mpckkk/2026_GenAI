import type { Agent, AnnotationRequest } from "@/app/core/agent";
import type { AccessService } from "./access";
import { UnavailableIntegrationError } from "@/app/core/errors";

export class AnnotationService implements Agent {
  constructor(private readonly access: AccessService) {}
  async run(userId: string, request: AnnotationRequest): Promise<never> {
    await this.access.requireProject(userId, request.projectId);
    throw new UnavailableIntegrationError("Annotation pipeline");
  }
}
