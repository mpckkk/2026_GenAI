// Optional Apple Silicon development runtime; Linux uses the Docker gateway.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  openSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dir = join(root, ".artifacts/openshell"),
  state = join(dir, "state");
const executable = join(dir, "bin/openshell-gateway"),
  pidFile = join(dir, "gateway.pid");
if (process.platform !== "darwin" || process.arch !== "arm64")
  throw new Error("Use the Docker gateway on Linux.");
let pid;
try {
  pid = Number(readFileSync(pidFile, "utf8"));
} catch {
  /* first run */
}
const owned =
  pid &&
  spawnSync("ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  }).stdout?.startsWith(executable + " ");
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
async function ready() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync(join(dir, "bin/openshell"), ["status"], {
      env: {
        ...process.env,
        XDG_CONFIG_HOME: join(dir, "host-config"),
        OPENSHELL_GATEWAY: "celloras",
      },
      stdio: "ignore",
      timeout: 2000,
    });
    if (result.status === 0) return;
    await wait(500);
  }
  throw new Error(
    "Gateway did not become ready; inspect .artifacts/openshell/gateway.log",
  );
}
if (process.argv[2] === "stop") {
  if (owned) {
    process.kill(pid, "SIGTERM");
    let exited = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      try {
        process.kill(pid, 0);
      } catch {
        exited = true;
        break;
      }
      await wait(250);
    }
    if (!exited)
      throw new Error(
        "Gateway is still stopping; inspect its log before restarting.",
      );
  }
  console.log(
    owned
      ? "Local MicroVM gateway stopped."
      : "No managed local gateway is running.",
  );
} else if (process.argv[2] === "start") {
  if (owned) {
    await ready();
    console.log("Local MicroVM gateway already running and connected.");
    process.exit(0);
  }
  if (!existsSync("/opt/homebrew/opt/e2fsprogs/sbin/mke2fs"))
    throw new Error(
      "Install e2fsprogs with brew install e2fsprogs before MicroVM setup.",
    );
  // Digests published in NVIDIA's v0.1.5 Homebrew release formula.
  for (const [name, checksum] of [
    [
      "openshell-gateway",
      "8e6fd1b05999709a9042ec83fcd902e062507af3e817f28bcda181fb93b42e7a",
    ],
    [
      "openshell-driver-vm",
      "125692d5e9b0183ceeadbc78b71de6007a3318dcc7ec9823e784b072ece2c4ac",
    ],
  ]) {
    if (existsSync(join(dir, "bin", name))) continue;
    const file = `${name}-aarch64-apple-darwin.tar.gz`;
    const response = await fetch(
      `https://github.com/NVIDIA/OpenShell/releases/download/v0.1.5/${file}`,
    );
    if (!response.ok) throw new Error("Runtime download failed");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== checksum)
      throw new Error("Runtime checksum mismatch");
    writeFileSync(join(dir, file), bytes, { mode: 0o600 });
    if (
      spawnSync("tar", ["-xzf", join(dir, file), "-C", join(dir, "bin")], {
        stdio: "inherit",
      }).status !== 0
    )
      throw new Error("Runtime extraction failed");
  }
  const entitlements = join(dir, "hypervisor.plist");
  writeFileSync(
    entitlements,
    '<?xml version="1.0"?><plist version="1.0"><dict><key>com.apple.security.hypervisor</key><true/></dict></plist>',
  );
  if (
    spawnSync(
      "/usr/bin/codesign",
      [
        "--entitlements",
        entitlements,
        "--force",
        "-s",
        "-",
        join(dir, "bin/openshell-driver-vm"),
      ],
      { stdio: "inherit" },
    ).status !== 0
  )
    throw new Error("Hypervisor signing failed");
  if (
    spawnSync(
      executable,
      [
        "generate-certs",
        "--output-dir",
        join(state, "tls"),
        "--server-san",
        "host.docker.internal",
        "--server-san",
        "openshell",
        "--server-san",
        "host.openshell.internal",
      ],
      { stdio: "inherit" },
    ).status !== 0
  )
    throw new Error("TLS bootstrap failed");
  const config = join(dir, "host-config/openshell/gateways/celloras");
  mkdirSync(join(config, "mtls"), { recursive: true, mode: 0o700 });
  for (const [source, destination] of [
    ["ca.crt", "ca.crt"],
    ["client/tls.crt", "tls.crt"],
    ["client/tls.key", "tls.key"],
  ]) {
    const target = join(config, "mtls", destination);
    copyFileSync(join(state, "tls", source), target);
    chmodSync(target, 0o600);
  }
  writeFileSync(
    join(config, "metadata.json"),
    JSON.stringify({
      name: "celloras",
      gateway_endpoint: "https://localhost:17670",
      is_remote: false,
      gateway_port: 0,
      auth_mode: "mtls",
    }),
    { mode: 0o600 },
  );
  const log = openSync(join(dir, "gateway.log"), "a", 0o600);
  const child = spawn(
    executable,
    ["--bind-address", "127.0.0.1", "--port", "17670"],
    {
      cwd: root,
      detached: true,
      stdio: ["ignore", log, log],
      env: {
        ...process.env,
        PATH: `${join(dir, "bin")}:${process.env.PATH}`,
        OPENSHELL_GATEWAY_CONFIG: join(state, "gateway.toml"),
        OPENSHELL_DB_URL: `sqlite:${join(state, "gateway.db")}?mode=rwc`,
        OPENSHELL_LOCAL_TLS_DIR: join(state, "tls"),
        XDG_DATA_HOME: state,
        XDG_STATE_HOME: state,
      },
    },
  );
  child.on("error", () => {
    console.error("Local gateway could not start; inspect its log.");
    process.exitCode = 1;
  });
  writeFileSync(pidFile, String(child.pid), { mode: 0o600 });
  child.unref();
  await ready();
  console.log(
    "Local MicroVM gateway connected. Log: .artifacts/openshell/gateway.log",
  );
} else throw new Error("Use start or stop.");
