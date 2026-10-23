import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

const template = await readFile(
  new URL("../.env.example", import.meta.url),
  "utf8",
);
const secrets = Object.fromEntries(
  [
    "POSTGRES_ADMIN_PASSWORD",
    "APP_DB_PASSWORD",
    "KEYCLOAK_DB_PASSWORD",
    "KEYCLOAK_ADMIN_PASSWORD",
    "KEYCLOAK_CLIENT_SECRET",
  ].map((key) => [key, randomBytes(32).toString("hex")]),
);
let output = template.replace(
  /^([A-Z_]+)=CHANGE_ME$/gm,
  (_, key) => `${key}=${secrets[key]}`,
);
output = output.replace(
  "celloras:CHANGE_ME@",
  `celloras:${secrets.APP_DB_PASSWORD}@`,
);
await writeFile(new URL("../.env", import.meta.url), output, {
  flag: "wx",
  mode: 0o600,
});
console.log(
  "Created local .env with generated secrets. Existing files are never overwritten.",
);
