import { AnalysisError } from "@/app/core/analysis.mjs";
import {
  AuthenticationRequiredError,
  ProjectNotFoundError,
  UnavailableIntegrationError,
  ResearchValidationError,
  ResearchConflictError,
  logFailure,
} from "@/app/core/errors";
import {
  ChatActiveTurnError,
  ChatCleanupPendingError,
  ChatRuntimeUnavailableError,
  ChatSubmissionConflictError,
  ChatTurnNotFoundError,
  ChatValidationError,
} from "@/app/core/chat";

export function apiError(error: unknown) {
  if (
    error instanceof AnalysisError ||
    (error instanceof Error &&
      "code" in error &&
      [
        "scientific_data_unavailable",
        "scientific_dataset_missing",
        "literature_unavailable",
      ].includes(String(error.code)))
  )
    return Response.json(
      {
        error:
          error instanceof AnalysisError &&
          error.code === "analysis_input_invalid"
            ? "Check the selected analysis and try again."
            : "The dataset or evidence source is temporarily unavailable.",
        code: String((error as Error & { code: string }).code),
      },
      {
        status:
          error instanceof AnalysisError &&
          error.code === "analysis_input_invalid"
            ? 400
            : 503,
      },
    );
  if (error instanceof AuthenticationRequiredError)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  if (error instanceof ProjectNotFoundError)
    return Response.json({ error: "Project not found" }, { status: 404 });
  if (error instanceof ChatValidationError)
    return Response.json(
      { error: error.message, fields: error.fields },
      { status: 400 },
    );
  if (error instanceof ChatSubmissionConflictError)
    return Response.json(
      { error: error.message, code: "SUBMISSION_CONFLICT" },
      { status: 409 },
    );
  if (error instanceof ChatActiveTurnError)
    return Response.json(
      { error: error.message, code: "TURN_ACTIVE" },
      { status: 409 },
    );
  if (error instanceof ChatRuntimeUnavailableError)
    return Response.json(
      { error: error.message, code: "AGENT_UNAVAILABLE" },
      { status: 503 },
    );
  if (error instanceof ChatCleanupPendingError)
    return Response.json(
      { error: error.message, code: "AGENT_CLEANUP_PENDING" },
      { status: 503 },
    );
  if (error instanceof ChatTurnNotFoundError)
    return Response.json(
      { error: error.message, code: "CHAT_TURN_NOT_FOUND" },
      { status: 404 },
    );
  if (error instanceof ResearchValidationError)
    return Response.json(
      { error: "Check the research entry fields.", fields: error.fields },
      { status: 400 },
    );
  if (error instanceof ResearchConflictError)
    return Response.json(
      {
        error: "This submission was already saved with different content.",
        code: "SUBMISSION_CONFLICT",
      },
      { status: 409 },
    );
  if (error instanceof UnavailableIntegrationError)
    return Response.json(
      { error: error.message, code: "INTEGRATION_PENDING" },
      { status: 503 },
    );
  logFailure("api.request.failed", error);
  return Response.json(
    { error: "The service is unavailable. Please try again." },
    { status: 503 },
  );
}
