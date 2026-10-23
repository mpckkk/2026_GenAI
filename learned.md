# Engineering notes

- Read the current Amigospace design kit before styling screens. Celloras uses black/white, Inter or system sans, 8px controls and 400/600 weights. The earlier green/cream landing is not evidence of the agreed design direction. Do not recreate a supplied logo from a prose description; obtain its actual bytes.
- Keycloak realm import skips existing realms. A theme requires both a mounted theme directory and a saved `loginTheme` setting; `npm run auth:theme` updates and confirms that setting locally.
- PatternFly login defaults add desktop container padding and switch the container to block layout on mobile. Override both explicitly, scope footer padding to direct children, and inspect screenshots at both widths. Passing account-flow tests alone does not prove the layout is correct.

- Git branch naming should result in an actual branch when requested. `celloras.com` is the sole working branch; `main` is an empty baseline.
- Docker Desktop ran out of disk while extracting Keycloak. User approved clearing unused build cache; `docker builder prune --force` reclaimed 6.464 GB. No image, container or volume pruning was performed. Check capacity before repeating large pulls.
- The first PostgreSQL startup tried to execute a read-only host-mounted shell initializer and failed with `bad interpreter: Permission denied`, despite host mode 0644. Prefer a SQL initializer using psql `\getenv`; this avoids script execution through the host mount. The partially initialized database was repaired by running the exact SQL file, without deleting the volume.
- OIDC has one canonical public issuer. Rewrite only its network transport to Keycloak's internal Compose address; never bypass issuer/audience/nonce validation to fix container networking.
- Current TypeScript ESLint support requires TypeScript below 6.1; pin 6.0.3. Next.js's bundled lint plugins require ESLint 9. Pin the compatible dependency graph instead of forcing peer resolution.
- A real mobile browser check found decorative rotated ellipses caused horizontal overflow at 390px. Remove their rotation at mobile widths; do not hide all page overflow to mask layout defects.
- Tests use real accounts and projects. Keep credentials and browser traces out of artifacts and Git. Screenshots of the landing page, project and health view are sufficient for visual evidence.
