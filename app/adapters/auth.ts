import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import type { Auth } from "@/app/core/auth";
import type { User } from "@/app/core/types";
import { AuthenticationRequiredError } from "@/app/core/errors";
import { config } from "@/app/config";
import { database } from "./database";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const sessionSeconds = 3600;
const cookieOptions = () => ({
  httpOnly: true,
  secure: config().secureCookies,
  sameSite: "lax" as const,
  path: "/",
});
const cookieName = (name: string) =>
  `${config().secureCookies ? "__Host-" : ""}celloras_${name}`;

function returnPath(value = "/app") {
  const url = new URL(value, config().appUrl);
  if (
    url.origin !== config().appUrl.origin ||
    !(url.pathname === "/app" || url.pathname.startsWith("/app/"))
  )
    return "/app";
  return `${url.pathname}${url.search}`;
}

export async function keycloakConfiguration() {
  const c = config();
  return oidc.discovery(c.issuer, c.clientId, c.clientSecret, undefined, {
    timeout: 5,
    ...(c.appEnv === "local" ? { execute: [oidc.allowInsecureRequests] } : {}),
    [oidc.customFetch]: async (input, init) => {
      const url = new URL(input);
      // Resolve the same canonical issuer inside Compose without relaxing issuer validation.
      if (
        url.origin === c.issuer.origin &&
        url.pathname.startsWith(c.issuer.pathname + "/")
      ) {
        url.pathname =
          c.internalIssuer.pathname +
          url.pathname.slice(c.issuer.pathname.length);
        url.protocol = c.internalIssuer.protocol;
        url.host = c.internalIssuer.host;
      }
      const body =
        init.body instanceof Uint8Array
          ? new Uint8Array(init.body).buffer
          : init.body;
      return fetch(url, {
        ...init,
        body,
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
    },
  });
}

export class KeycloakAuth implements Auth {
  async currentUser(): Promise<User | null> {
    const token = (await cookies()).get(cookieName("session"))?.value;
    if (!token) return null;
    const result = await database().query<{ id: string; display_name: string }>(
      "SELECT u.id, u.display_name FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()",
      [hash(token)],
    );
    return result.rows[0]
      ? { id: result.rows[0].id, displayName: result.rows[0].display_name }
      : null;
  }

  async requireUser() {
    const user = await this.currentUser();
    if (!user) throw new AuthenticationRequiredError();
    return user;
  }

  async begin(mode: "login" | "register", requestedReturnTo?: string) {
    const c = config();
    const configuration = await keycloakConfiguration();
    const transaction = random();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const verifier = oidc.randomPKCECodeVerifier();
    await database().query(
      "DELETE FROM oauth_transactions WHERE expires_at <= now()",
    );
    await database().query(
      "DELETE FROM app_sessions WHERE expires_at <= now()",
    );
    await database().query(
      "INSERT INTO oauth_transactions (token_hash,state,nonce,verifier,return_to,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '10 minutes')",
      [
        hash(transaction),
        state,
        nonce,
        verifier,
        returnPath(requestedReturnTo),
      ],
    );
    (await cookies()).set(cookieName("oauth"), transaction, {
      ...cookieOptions(),
      maxAge: 600,
    });
    const url = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: new URL("/api/auth/callback", c.appUrl).href,
      scope: "openid profile email",
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
    });
    if (mode === "register")
      url.pathname = url.pathname.replace(/\/auth$/, "/registrations");
    return url;
  }

  async complete(callback: URL) {
    const jar = await cookies();
    const token = jar.get(cookieName("oauth"))?.value;
    jar.delete(cookieName("oauth"));
    if (!token) throw new Error("Missing authentication transaction");
    const consumed = await database().query<{
      state: string;
      nonce: string;
      verifier: string;
      return_to: string;
    }>(
      "DELETE FROM oauth_transactions WHERE token_hash=$1 AND expires_at > now() RETURNING state,nonce,verifier,return_to",
      [hash(token)],
    );
    const transaction = consumed.rows[0];
    if (!transaction) throw new Error("Expired authentication transaction");
    const tokens = await oidc.authorizationCodeGrant(
      await keycloakConfiguration(),
      callback,
      {
        pkceCodeVerifier: transaction.verifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        idTokenExpected: true,
      },
    );
    const claims = tokens.claims();
    if (!claims?.sub || !tokens.id_token)
      throw new Error("Missing verified identity");
    const identity = await database().query<{ id: string }>(
      "INSERT INTO app_users (issuer,subject,display_name) VALUES ($1,$2,$3) ON CONFLICT (issuer,subject) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id",
      [
        claims.iss,
        claims.sub,
        typeof claims.name === "string" ? claims.name : "Researcher",
      ],
    );
    const session = random();
    const priorSession = jar.get(cookieName("session"))?.value;
    if (priorSession)
      await database().query("DELETE FROM app_sessions WHERE token_hash=$1", [
        hash(priorSession),
      ]);
    await database().query(
      "INSERT INTO app_sessions (token_hash,user_id,id_token,expires_at) VALUES ($1,$2,$3,now()+interval '1 hour')",
      [hash(session), identity.rows[0].id, tokens.id_token],
    );
    jar.set(cookieName("session"), session, {
      ...cookieOptions(),
      maxAge: sessionSeconds,
    });
    return returnPath(transaction.return_to);
  }

  async logout() {
    const jar = await cookies();
    const token = jar.get(cookieName("session"))?.value;
    jar.delete(cookieName("session"));
    let idToken: string | undefined;
    if (token) {
      const result = await database().query<{ id_token: string }>(
        "DELETE FROM app_sessions WHERE token_hash=$1 RETURNING id_token",
        [hash(token)],
      );
      idToken = result.rows[0]?.id_token;
    }
    const c = config();
    return oidc.buildEndSessionUrl(await keycloakConfiguration(), {
      client_id: c.clientId,
      post_logout_redirect_uri: new URL("/", c.appUrl).href,
      ...(idToken ? { id_token_hint: idToken } : {}),
    });
  }
}
