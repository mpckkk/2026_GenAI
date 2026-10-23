import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  OpenShellCodex,
  sandboxName,
} from "../app/adapters/agent-openshell.mjs";
import { responseText } from "../app/core/agent-response.mjs";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dir = resolve(
  process.argv
    .find((arg) => arg.startsWith("--home="))
    ?.slice("--home=".length) ||
    process.env.CELLORAS_AGENT_HOME ||
    join(root, ".artifacts/openshell"),
);
process.env.OPENSHELL_BIN = join(dir, "bin/openshell");
process.env.XDG_CONFIG_HOME = join(dir, "host-config");
process.env.OPENSHELL_GATEWAY = "celloras";
process.env.CELLORAS_AGENT_METADATA_FILE = join(dir, "agent-metadata.json");
const runtime = new OpenShellCodex();
try {
  await runtime.health();
  const reply = await runtime.run({
    name: sandboxName(randomUUID()),
    prompt: "Reply with exactly: CELLORAS_OPEN_SHELL_OK",
    progress: console.log,
  });
  if (
    responseText(reply) !== "CELLORAS_OPEN_SHELL_OK" ||
    reply.blocks.length !== 1
  )
    throw new Error("Unexpected probe response");
  console.log(
    "Real Codex reply through OpenShell verified; probe sandbox deleted.",
  );
} catch (error) {
  console.error(
    `Agent probe failed: ${error.code || "verification_failed"}. Inspect OpenShell logs; no host execution fallback was used.`,
  );
  process.exitCode = 1;
}
