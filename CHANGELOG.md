# Changelog

## 0.1.0 — 2026-10-23

- Created the Next.js/TypeScript workspace foundation on `celloras.com`.
- Added a responsive landing page and labelled illustrative annotation card.
- Added Keycloak authorization-code login/registration with PKCE, state and nonce validation, database-backed app sessions, and provider logout.
- Added PostgreSQL identities and owned projects, server-side access checks, project creation/reopening, and service-health pages/APIs.
- Added flat contracts and explicit pending adapters for H-MEM, Zetaris, Nemotron/Vercel, NVIDIA Files and NVIDIA observability. Unfinished annotation requests return 503 after ownership checks.
- Added local Compose, separate database roles, generated local secrets, Keycloak realm import and checksummed migrations.
- Added real browser acceptance tests and CI lint/build checks. Runtime evidence and remaining work are recorded in `docs/verification.md`.
