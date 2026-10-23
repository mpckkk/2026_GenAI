import { copyFile, mkdir } from "node:fs/promises";

// The supplied original is the single source for both the web and auth logo.
const source = new URL("../docs/assets/celloras-logo.png", import.meta.url);
const directory = new URL(
  "../infra/keycloak/themes/celloras/login/resources/img/",
  import.meta.url,
);
const destination = new URL("celloras-logo.png", directory);

await mkdir(directory, { recursive: true });
await copyFile(source, destination);
console.log("Celloras: synchronized the original logo to the Keycloak theme.");
