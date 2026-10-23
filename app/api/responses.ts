import {
  AuthenticationRequiredError,
  ProjectNotFoundError,
  UnavailableIntegrationError,
  ResearchValidationError,
  ResearchConflictError,
  logFailure,
} from "@/app/core/errors";

export function apiError(error: unknown) {
  if (error instanceof AuthenticationRequiredError)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  if (error instanceof ProjectNotFoundError)
    return Response.json({ error: "Project not found" }, { status: 404 });
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
