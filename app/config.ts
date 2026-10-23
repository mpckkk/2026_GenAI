import "server-only";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

export function config() {
  const appEnv = required("APP_ENV");
  if (!["local", "production"].includes(appEnv))
    throw new Error("Invalid APP_ENV");
  const appUrl = new URL(required("APP_URL"));
  const issuer = new URL(required("KEYCLOAK_ISSUER"));
  const internalIssuer = new URL(required("KEYCLOAK_INTERNAL_ISSUER"));
  if (
    appEnv === "production" &&
    [appUrl, issuer, internalIssuer].some((url) => url.protocol !== "https:")
  ) {
    throw new Error("Production URLs must use HTTPS");
  }
  return {
    appEnv,
    appUrl,
    issuer,
    internalIssuer,
    databaseUrl: required("DATABASE_URL"),
    clientId: required("KEYCLOAK_CLIENT_ID"),
    clientSecret: required("KEYCLOAK_CLIENT_SECRET"),
    secureCookies: appUrl.protocol === "https:",
  };
}

export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== config().appUrl.origin)
    throw new Error("Invalid request origin");
}
