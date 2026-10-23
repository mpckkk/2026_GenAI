# Configuration ownership

Celloras separates reviewed application configuration, deployment secrets and research data.

| Configuration                                                        | Source of truth                                                      | Consumer                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Enabled plants and suggested tissue labels                           | Versioned `app/plant-catalog.ts`                                     | Validated `ConfiguredPlantCatalog`, injected in `app/bootstrap.ts` |
| Application URLs, runtime mode and auth/database settings            | Ignored local `.env`; explicit Compose environment mapping           | `app/config.ts`, database/auth adapters                            |
| Experiment context, genome versions, marker lists and reviewed calls | PostgreSQL research entries                                          | Authorized research service and UI                                 |
| Provider SDK/endpoint behavior                                       | Provider adapters and model gateway                                  | Core interfaces; never browser components                          |
| Production credentials                                               | Deployment secret store, supplied to the relevant service at runtime | Server-side adapter configuration                                  |

The initial catalog enables soybean (`glycine-max`). Species IDs are stored as data, not a SQL enum or soybean-specific table. Tissue suggestions do not impose a biological ontology; researchers may enter a different tissue. Declared genome versions and identifiers are research context, not verified compatibility claims. Reference adapters must validate compatibility before analytical work is enabled.

Adding a plant requires a reviewed catalog entry, suitable reference data/mappings and analytical evaluation. It does not require replacing the chat renderer or experiment storage. Adding a supported plant does not automatically enable cross-species label transfer.

## Local configuration

`npm run setup` creates local development settings; never overwrite existing `.env` values or print their contents. `.env.example` documents variable names and placeholders only. The repository ignores `.env` and browser authentication traces. The Compose file passes only declared variables into each service. Use `APP_ENV=local` only for local HTTP development.

Secrets must not be stored in the plant catalog, PostgreSQL research payloads, prompts, screenshots, telemetry or Git. Central configuration validation identifies missing/invalid settings without logging their values. The browser receives catalog metadata and owned research records, not provider configuration.

## Scientific integrations

Nemotron/Vercel model routing, Zetaris reference access, H-MEM, NVIDIA file storage and trace export are still pending. This wave does not invent provider endpoint settings or turn placeholder credentials into a working integration. Their adapters must define and validate the exact required environment variables when their real provider routes are implemented. Record names and setup steps here and in `.env.example` at that time; secret values stay outside version control.

The current chat workspace saves researcher-authored notes, context, markers and manual reviews. It does not generate an assistant answer without a live scientific integration. The service-health page distinguishes working application services from pending providers.

## Deployment and scaling

Keep state in PostgreSQL and large bytes behind the Assets interface. A production deployment needs a chosen secret store, HTTPS, backups and retention configuration; local Compose does not establish those. Long-running analysis can later execute through a durable job/worker boundary, independently of web requests. No queue or worker deployment is claimed in this wave.
