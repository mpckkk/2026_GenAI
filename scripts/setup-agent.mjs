import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  chmod,
  access,
} from "node:fs/promises";
import { homedir, userInfo } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const option = (name) =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const localDir = join(root, ".artifacts/openshell");
// Production state must survive a deployment replacing the source checkout.
const dir = resolve(
  option("home") || process.env.CELLORAS_AGENT_HOME || localDir,
);
const settingsFile = option("settings-file");
const composeFiles = process.argv
  .filter((arg) => arg.startsWith("--compose-file="))
  .flatMap((arg) => ["-f", resolve(arg.slice("--compose-file=".length))]);
const composeProject = option("compose-project");
const state = join(dir, "state");
const bin = join(dir, "bin/openshell");
const configuration = join(dir, "host-config");
const version = "0.1.5";
const runtime = option("runtime") || "docker";
if (!["docker", "vm"].includes(runtime))
  throw new Error("Select --runtime=docker or --runtime=vm explicitly.");
if (runtime === "vm" && dir !== localDir)
  throw new Error("The managed local MicroVM uses the default agent home.");
const platform =
  process.platform === "darwin" ? "apple-darwin" : "unknown-linux-musl";
const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
if (!["darwin", "linux"].includes(process.platform))
  throw new Error("Run agent setup on macOS or Linux.");
const cliEnv = {
  ...process.env,
  XDG_CONFIG_HOME: configuration,
  OPENSHELL_GATEWAY: "celloras",
};
function run(command, args, env = process.env, quiet = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });
  if (result.status !== 0)
    throw new Error(
      `${command.split("/").at(-1)} ${args[0]} failed (${result.status})`,
    );
  return result.stdout ?? "";
}
await mkdir(join(dir, "bin"), { recursive: true, mode: 0o700 });
await mkdir(state, { recursive: true, mode: 0o700 });
try {
  await access(bin);
} catch {
  const filename = `openshell-${arch}-${platform}.tar.gz`;
  const base = `https://github.com/NVIDIA/OpenShell/releases/download/v${version}/`;
  const archiveResponse = await fetch(base + filename);
  if (!archiveResponse.ok) throw new Error("OpenShell download failed");
  const archive = Buffer.from(await archiveResponse.arrayBuffer());
  const checksumResponse = await fetch(base + "openshell-checksums-sha256.txt");
  if (!checksumResponse.ok) throw new Error("Checksum download failed");
  const checksum = (await checksumResponse.text())
    .split("\n")
    .find((line) => line.trim().endsWith(filename))
    ?.split(/\s+/)[0];
  if (createHash("sha256").update(archive).digest("hex") !== checksum)
    throw new Error("OpenShell checksum mismatch");
  const path = join(dir, filename);
  await writeFile(path, archive, { mode: 0o600 });
  run("tar", ["-xzf", path, "-C", join(dir, "bin")]);
}
if (!run(bin, ["--version"], cliEnv, true).includes(version))
  throw new Error("Unexpected OpenShell version");
const toml = `[openshell]\nversion = 2\n[openshell.gateway]\nbind_address = "0.0.0.0:17670"\nhealth_bind_address = "0.0.0.0:17671"\ncompute_driver = "docker"\nlog_level = "info"\n[openshell.gateway.gateway_jwt]\nsigning_key_path = ${JSON.stringify(join(state, "tls/jwt/signing.pem"))}\npublic_key_path = ${JSON.stringify(join(state, "tls/jwt/public.pem"))}\nkid_path = ${JSON.stringify(join(state, "tls/jwt/kid"))}\ngateway_id = "celloras"\n[openshell.drivers.docker]\ndefault_image = "celloras-codex:0.163.0-annotation1"\nsandbox_runtime_image = "ghcr.io/nvidia/openshell/sandbox:0.1.5"\nsupervisor_image = "ghcr.io/nvidia/openshell/supervisor:0.1.5"\nimage_pull_policy = "if_not_present"\nsandbox_label = "celloras"\napp_armor_profile = "Unconfined"\n`;
let gatewayConfig = toml.replace(
  'health_bind_address = "0.0.0.0:17671"',
  'health_bind_address = "127.0.0.1:17671"',
);
if (runtime === "vm") {
  if (process.platform !== "darwin" || process.arch !== "arm64")
    throw new Error(
      "This local MicroVM helper supports Apple Silicon; use Docker on Linux.",
    );
  gatewayConfig = gatewayConfig.replace(
    'compute_driver = "docker"',
    'compute_driver = "vm"',
  );
  gatewayConfig =
    gatewayConfig.slice(
      0,
      gatewayConfig.indexOf("[openshell.drivers.docker]"),
    ) +
    `[openshell.drivers.vm]\ndefault_image = "celloras-codex:0.163.0-annotation1"\nbootstrap_image = "celloras-codex:0.163.0-annotation1"\nvcpus = 2\nmem_mib = 2048\nstate_dir = ${JSON.stringify(join(state, "vm-driver"))}\n`;
} else {
  gatewayConfig =
    gatewayConfig.replace('app_armor_profile = "Unconfined"\n', "") +
    'supervisor_network_mode = "host"\ngrpc_endpoint = "https://127.0.0.1:17670"\n';
}
const gatewayConfigPath = join(state, "gateway.toml");
let previousGatewayConfig;
try {
  previousGatewayConfig = await readFile(gatewayConfigPath, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const gatewayConfigChanged = previousGatewayConfig !== gatewayConfig;
await writeFile(gatewayConfigPath, gatewayConfig, { mode: 0o600 });
const identity = userInfo();
const runtimeSettings = {
  CELLORAS_AGENT_HOME: dir,
  OPENSHELL_STATE_DIR: state,
  OPENSHELL_CONFIG_DIR: join(dir, "worker-config"),
  CELLORAS_AGENT_METADATA_FILE: join(dir, "agent-metadata.json"),
  CELLORAS_WORKER_UID: String(identity.uid),
  CELLORAS_WORKER_GID: String(identity.gid),
  COMPOSE_PROFILES: runtime === "docker" ? "agent,agent-docker" : "agent",
};
if (settingsFile) {
  // A deployment manager can merge these non-secret settings without this
  // helper racing its environment updates or activating the worker early.
  await writeFile(
    resolve(settingsFile),
    Object.entries(runtimeSettings)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(""),
    { mode: 0o600 },
  );
} else {
  const envPath = join(root, ".env");
  let localEnv = await readFile(envPath, "utf8");
  for (const [key, value] of Object.entries(runtimeSettings)) {
    localEnv =
      localEnv.replace(new RegExp(`^${key}=.*\\n?`, "gm"), "").trimEnd() +
      `\n${key}=${value}\n`;
  }
  await writeFile(envPath, localEnv, { mode: 0o600 });
}
// A running gateway does not reload TOML. In particular, the VM bootstrap
// image must advance with the workload revision even when --from names the
// new image. Keep its existing database, TLS and encryption state intact.
if (runtime === "docker")
  run(
    "docker",
    [
      "compose",
      ...composeFiles,
      ...(composeProject ? ["-p", composeProject] : []),
      "up",
      "-d",
      ...(gatewayConfigChanged ? ["--force-recreate"] : []),
      "openshell",
    ],
    { ...process.env, ...runtimeSettings },
  );
else {
  if (gatewayConfigChanged)
    run(process.execPath, ["scripts/agent-gateway.mjs", "stop"]);
  run(process.execPath, ["scripts/agent-gateway.mjs", "start"]);
}
for (const configDir of [configuration, join(dir, "worker-config")]) {
  const mtls = join(configDir, "openshell/gateways/celloras/mtls");
  await mkdir(mtls, { recursive: true, mode: 0o700 });
  for (const [source, destination] of [
    ["ca.crt", "ca.crt"],
    ["client/tls.crt", "tls.crt"],
    ["client/tls.key", "tls.key"],
  ]) {
    await copyFile(join(state, "tls", source), join(mtls, destination));
    await chmod(join(mtls, destination), 0o600);
  }
  if (configDir !== configuration)
    await writeFile(
      join(configDir, "openshell/gateways/celloras/metadata.json"),
      JSON.stringify({
        name: "celloras",
        gateway_endpoint:
          runtime === "docker"
            ? "https://openshell:17670"
            : "https://host.docker.internal:17670",
        is_remote: true,
        gateway_port: 0,
        auth_mode: "mtls",
      }),
      { mode: 0o600 },
    );
}
let connected = false;
spawnSync(
  bin,
  [
    "gateway",
    "add",
    "https://localhost:17670",
    "--local",
    "--name",
    "celloras",
  ],
  { env: cliEnv, stdio: "ignore" },
);
for (let attempt = 0; attempt < 30; attempt++) {
  if (
    spawnSync(bin, ["status"], { env: cliEnv, stdio: "ignore" }).status === 0
  ) {
    connected = true;
    break;
  }
  await new Promise((done) => setTimeout(done, 1000));
}
if (!connected)
  throw new Error(
    "OpenShell gateway registration failed; inspect docker compose logs openshell",
  );
run(bin, ["status"], cliEnv);
const hasProfile =
  spawnSync(bin, ["provider", "profile", "describe", "celloras-codex"], {
    env: cliEnv,
    stdio: "ignore",
  }).status === 0;
let profileFile = "infra/agent/codex-provider.yaml";
if (hasProfile) {
  const current = JSON.parse(
    run(
      bin,
      ["provider", "profile", "export", "celloras-codex", "-o", "json"],
      cliEnv,
      true,
    ),
  );
  if (!Number.isInteger(current.resource_version))
    throw new Error("Provider profile version unavailable");
  const profile = await readFile(join(root, profileFile), "utf8");
  profileFile = join(dir, "codex-provider-update.yaml");
  await writeFile(
    profileFile,
    profile + `\nresource_version: ${current.resource_version}\n`,
    { mode: 0o600 },
  );
}
run(
  bin,
  [
    "provider",
    "profile",
    ...(hasProfile ? ["update", "celloras-codex"] : ["import"]),
    "--file",
    profileFile,
  ],
  cliEnv,
);
const authFile =
  process.env.CELLORAS_CODEX_AUTH_FILE || join(homedir(), ".codex/auth.json");
const auth = JSON.parse(await readFile(authFile, "utf8"));
if (!auth.tokens?.access_token || !auth.tokens?.account_id)
  throw new Error("Sign in using codex login before agent setup.");
const expiresAt = JSON.parse(
  Buffer.from(auth.tokens.access_token.split(".")[1], "base64url").toString(),
).exp;
if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now() + 60000)
  throw new Error("Renew the Codex login before agent setup.");
const credentialEnv = {
  ...cliEnv,
  CODEX_AUTH_ACCESS_TOKEN: auth.tokens.access_token,
  CODEX_AUTH_ACCOUNT_ID: auth.tokens.account_id,
};
const existing =
  spawnSync(bin, ["provider", "get", "celloras-codex"], {
    env: cliEnv,
    stdio: "ignore",
  }).status === 0;
run(
  bin,
  existing
    ? [
        "provider",
        "update",
        "celloras-codex",
        "--credential",
        "CODEX_AUTH_ACCESS_TOKEN",
        "--credential",
        "CODEX_AUTH_ACCOUNT_ID",
      ]
    : [
        "provider",
        "create",
        "--name",
        "celloras-codex",
        "--type",
        "celloras-codex",
        "--credential",
        "CODEX_AUTH_ACCESS_TOKEN",
        "--credential",
        "CODEX_AUTH_ACCOUNT_ID",
      ],
  credentialEnv,
  true,
);
console.log(
  "OpenShell connected; Codex access credential stored in the gateway. Personal refresh credentials were not imported.",
);
// Account ID is non-secret routing metadata. No bearer or refresh token is shared with the worker.
await writeFile(
  join(dir, "agent-metadata.json"),
  JSON.stringify({ accountId: auth.tokens.account_id, expiresAt }),
  { mode: 0o600 },
);
run("docker", [
  "build",
  "-t",
  "celloras-codex:0.163.0-annotation1",
  "-f",
  "infra/agent/codex.Dockerfile",
  ".",
]);
console.log(
  `Run npm run agent:verify -- --home=${JSON.stringify(dir)} for a real sandbox probe. Then ${settingsFile ? "merge the generated settings into the deployment environment and " : ""}start agent-worker and app using the same Compose files and project.`,
);
