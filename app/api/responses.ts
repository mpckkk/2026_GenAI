import {
  AuthenticationRequiredError,
  ProjectNotFoundError,
  UnavailableIntegrationError,
  logFailure,
} from "@/app/core/errors";

export function apiError(error: unknown) {
  if (error instanceof AuthenticationRequiredError)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  if (error instanceof ProjectNotFoundError)
    return Response.json({ error: "Project not found" }, { status: 404 });
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
