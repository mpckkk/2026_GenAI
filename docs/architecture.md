# Foundation boundaries

The saved [architecture](https://space.heyamigo.org/items/aa82709a-dc23-4686-8718-c08a743fdae3) defines the direction. This repository implements the workspace foundation first.

## Identity and ownership

The browser starts at `/login` or `/register`. `KeycloakAuth` uses `openid-client` for authorization code exchange, PKCE, state, nonce, issuer and audience validation. Transaction secrets live in PostgreSQL and expire after ten minutes. An HttpOnly, SameSite=Lax cookie contains only an opaque transaction handle; callbacks atomically consume it.

Verified `(issuer, subject)` maps to an application user. An opaque random session cookie maps through a SHA-256 hash to a server-side record. Provider tokens never enter browser storage, UI cards, models or telemetry. The ID token stays in the session record solely for provider logout; tokens are not otherwise retained. Sessions expire after one hour. Logout is an origin-checked POST that revokes the app session and ends the Keycloak session.

Project queries include the authenticated owner ID in SQL. Foreign and absent IDs both return 404. API routes and server actions enforce identity and ownership independently of page layouts. POST APIs validate origin; Next.js server actions also enforce their framework origin checks.

The canonical issuer is browser-accessible `http://localhost:8180/realms/celloras`. Inside Compose, a custom OIDC fetch transport resolves only that issuer's requests to the internal Keycloak service. Issuer validation remains against the public canonical URL. HTTP is allowed only under the explicit local configuration; production URLs must be HTTPS.

## Integration ledger

| Boundary                     | Foundation state                                           | Next acceptance                                                               |
| ---------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Keycloak auth                | OIDC implementation + imported local realm                 | SMTP verification/recovery and production logout/revocation policy            |
| PostgreSQL projects          | Owned projects, identities, sessions, migrations           | Retention, backups and deployment migrations                                  |
| Zetaris marker data          | Contract + adapter raising `UnavailableIntegrationError`   | Actual marker sources, provenance and live query                              |
| Nemotron / Vercel AI Gateway | Model-call contract + explicit pending adapter             | Confirm model routing and credentials, then bounded live call                 |
| H-MEM                        | Memory contract + explicit pending adapter                 | Implement retrieval, mining, corrections and provenance in our app            |
| NVIDIA NeMo Files            | Asset contract + explicit pending adapter                  | Real byte upload/download, durability and project authorization               |
| NVIDIA Intake / Studio       | Provider-neutral span interface + explicit pending adapter | OTLP/HTTP protobuf exporter, nested trace and failure visibility in Studio    |
| Annotation service           | Ownership gate, then explicit unavailable result           | Evidence-backed scoring, conflict handling, bounded loop and evaluation cases |

Pending adapters do not execute callbacks, return synthetic content, retry through another provider or pretend to export telemetry. Their dependencies will be added when the corresponding integration is implemented. NeMo/ClickHouse and Zetaris containers are deliberately not invented in Compose before their startup contracts are verified.

Landing-page content demonstrates a result layout and is labelled illustrative. It is not an evaluation example, calibrated confidence score or real biological result. UMAP rendering requires actual source coordinates.

## Sources

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [openid-client authorization-code example](https://github.com/panva/openid-client/blob/main/examples/oidc.ts)
- [Keycloak hostname configuration](https://www.keycloak.org/server/hostname)
- [Keycloak realm imports](https://www.keycloak.org/server/importExport)
- [H-MEM specification](https://github.com/Meterless/H-MEM)
- [NVIDIA tracing](https://docs.nvidia.com/nemo-helix/latest/documentation/agents/observe-agents)
