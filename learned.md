# Engineering notes

- Research context must be immutable when attached to a marker set. Store the selected context entry and its snapshot; changing the current sample must not reinterpret older clusters.
- Recent-marker limits can hide older clusters from manual review. Include markers displayed or referenced on the current history page, alongside the recent list; the regression uses 101 real marker sets.
- A save can commit while its HTTP response is lost. Keep the submission UUID on ordinary retries. If an edited draft conflicts with a committed submission, offer an explicit new-entry save; silently generating another UUID can duplicate records.
- PostgreSQL restart preserved every research record but left a stale Keycloak connection that failed the next registration. For local database maintenance, restart Keycloak as well, wait for service health, and verify a real auth flow; the app's discovery check alone does not prove registration works.
- Docker's desktop credential helper stalled an anonymous public-image build. A task-local Docker configuration without a credential store, pointed at the existing socket, completed the build without changing the user's login configuration.
- Wait for actual image decoding before capturing branding screenshots; DOM visibility alone can precede the first image paint.
- Full-page mobile capture after resizing produced repeated image tiles despite a single header in the DOM. Reloading at the target viewport produced a correct full-page capture; inspect both the full page and a scrolled viewport when checking responsive records.

- Read the current Amigospace design kit before styling screens. Celloras uses black/white, Inter or system sans, 8px controls and 400/600 weights. The earlier green/cream landing is not evidence of the agreed design direction. Do not recreate a supplied logo from a prose description; obtain its actual bytes.
- Keycloak realm import skips existing realms. A theme requires both a mounted theme directory and a saved `loginTheme` setting; `npm run auth:configure` updates and confirms theme and signup settings locally.
- User correction: signup should ask only for email/password/confirmation. First/last name do not belong in the first step. Configure their permissions and remove required rules in Keycloak; hiding required fields with CSS would break real registration. Keep the form spacious and review it as a signup experience, not only as a working provider form.
- PatternFly login defaults add desktop container padding and switch the container to block layout on mobile. Override both explicitly, scope footer padding to direct children, and inspect screenshots at both widths. Passing account-flow tests alone does not prove the layout is correct.

- Git branch naming should result in an actual branch when requested. `celloras.com` is the sole working branch; `main` is an empty baseline.
- Docker Desktop ran out of disk while extracting Keycloak. User approved clearing unused build cache; `docker builder prune --force` reclaimed 6.464 GB. No image, container or volume pruning was performed. Check capacity before repeating large pulls.
- The first PostgreSQL startup tried to execute a read-only host-mounted shell initializer and failed with `bad interpreter: Permission denied`, despite host mode 0644. Prefer a SQL initializer using psql `\getenv`; this avoids script execution through the host mount. The partially initialized database was repaired by running the exact SQL file, without deleting the volume.
- OIDC has one canonical public issuer. Rewrite only its network transport to Keycloak's internal Compose address; never bypass issuer/audience/nonce validation to fix container networking.
- Current TypeScript ESLint support requires TypeScript below 6.1; pin 6.0.3. Next.js's bundled lint plugins require ESLint 9. Pin the compatible dependency graph instead of forcing peer resolution.
- A real mobile browser check found decorative rotated ellipses caused horizontal overflow at 390px. Remove their rotation at mobile widths; do not hide all page overflow to mask layout defects.
- Tests use real accounts and projects. Keep credentials and browser traces out of artifacts and Git. Screenshots of the landing page, project and health view are sufficient for visual evidence.
