# Changelog

## 0.1.2 — 2026-10-23

- Simplified signup to email, password and password confirmation. First/last name are optional administrative attributes; registration and subsequent login do not require them.
- Widened registration to 560px and increased card padding and field spacing, with a separate mobile layout.
- Added the profile settings to realm import and renamed the existing setup command to `npm run auth:configure` to apply theme and signup settings to existing realms.

## 0.1.1 — 2026-10-23

- Replaced the default Keycloak login/registration appearance with the Celloras design kit: black actions, white cards, system sans, 8px controls and responsive spacing.
- Preserved Keycloak's real credential forms, password visibility controls, validation and OIDC flow; added a home link and clearer account navigation.
- Mounted the inherited theme in Compose and added explicit activation for existing local realms. The exact logo asset is still pending.
- Added browser coverage and screenshots for both forms and their validation states; verified registration, login, logout and account isolation against the running stack.

## 0.1.0 — 2026-10-23

- Created the Next.js/TypeScript workspace foundation on `celloras.com`.
- Added a responsive landing page and labelled illustrative annotation card.
- Added Keycloak authorization-code login/registration with PKCE, state and nonce validation, database-backed app sessions, and provider logout.
- Added PostgreSQL identities and owned projects, server-side access checks, project creation/reopening, and service-health pages/APIs.
- Added flat contracts and explicit pending adapters for H-MEM, Zetaris, Nemotron/Vercel, NVIDIA Files and NVIDIA observability. Unfinished annotation requests return 503 after ownership checks.
- Added local Compose, separate database roles, generated local secrets, Keycloak realm import and checksummed migrations.
- Added real browser acceptance tests and CI lint/build checks. Runtime evidence and remaining work are recorded in `docs/verification.md`.
