import type { Agent, AnnotationRequest } from "@/app/core/agent";
import type { AccessService } from "./access";
import type { ChatService } from "./chat";
import { ChatValidationError } from "@/app/core/chat";

export class AnnotationService implements Agent {
  constructor(
    private readonly access: AccessService,
    private readonly chat: ChatService,
  ) {}
  async run(userId: string, request: AnnotationRequest) {
    await this.access.requireProject(userId, request.projectId);
    if (
      Object.keys(request).some(
        (key) =>
          !["projectId", "submissionId", "datasetId", "cluster"].includes(key),
      )
    )
      throw new ChatValidationError({
        annotation:
          "Use an attached dataset and optional cluster to request annotation. Gene-only requests are not supported by this dataset workflow.",
      });
    return this.chat.submit(userId, request.projectId, {
      submissionId: request.submissionId,
      prompt: `Annotate ${request.cluster ? `cluster ${request.cluster}` : "all clusters"} in the attached dataset. Show candidate cell types, actual marker evidence, alternatives and uncertainty. Keep final label decisions for researcher review.`,
      action: {
        operation: "annotation",
        datasetId: request.datasetId,
        ...(request.cluster !== undefined ? { cluster: request.cluster } : {}),
      },
    });
  }
}
