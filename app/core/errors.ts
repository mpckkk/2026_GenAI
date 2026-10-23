export class UnavailableIntegrationError extends Error {
  constructor(public readonly integration: string) {
    super(`${integration} is not connected yet.`);
  }
}
export class AuthenticationRequiredError extends Error {}
export class ProjectNotFoundError extends Error {}
export class ResearchValidationError extends Error {
  constructor(public readonly fields: Record<string, string>) {
    super("Check the research entry fields and try again.");
    this.name = "ResearchValidationError";
  }
}
export class ResearchConflictError extends Error {
  constructor() {
    super(
      "This submission was already saved with different content. Refresh before submitting a new entry.",
    );
    this.name = "ResearchConflictError";
  }
}
export function logFailure(event: string, error: unknown) {
  // Do not serialize provider exceptions: they may contain tokens or request bodies.
  console.error(
    JSON.stringify({
      event,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
}
