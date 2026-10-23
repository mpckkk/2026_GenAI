export class UnavailableIntegrationError extends Error {
  constructor(public readonly integration: string) {
    super(`${integration} is not connected yet.`);
  }
}
export class AuthenticationRequiredError extends Error {}
export class ProjectNotFoundError extends Error {}
export function logFailure(event: string, error: unknown) {
  // Do not serialize provider exceptions: they may contain tokens or request bodies.
  console.error(
    JSON.stringify({
      event,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
}
