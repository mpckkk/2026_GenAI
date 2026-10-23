import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseAgentResponse } from "../core/agent-response.mjs";

// OpenShell limits sandbox names to 19 characters.
export function sandboxName(turnId) {
  return `c${BigInt(`0x${turnId.replaceAll("-", "")}`)
    .toString(36)
    .padStart(25, "0")
    .slice(0, 18)}`;
}

export class AgentExecutionError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Runtime boundary. Queue code does not know whether OpenShell uses Docker,
// MicroVMs or Kubernetes. A future CLI adapter can implement the same methods.
/** @implements {import('../core/chat').AgentRuntime} */
export class OpenShellCodex {
  constructor() {
    this.bin = process.env.OPENSHELL_BIN || "openshell";
    this.image =
      process.env.CELLORAS_AGENT_IMAGE || "celloras-codex:0.163.0-annotation1";
    this.provider = process.env.CELLORAS_AGENT_PROVIDER || "celloras-codex";
    this.model = process.env.CELLORAS_AGENT_MODEL || "";
    this.metadataPath = process.env.CELLORAS_AGENT_METADATA_FILE;
    if (!this.metadataPath)
      throw new AgentExecutionError("runtime_not_configured");
  }

  command(args, { input, signal, timeout = 20000, onLine } = {}) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new AgentExecutionError("cancelled"));
      const child = spawn(this.bin, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });
      let stdout = "",
        pending = "",
        bytes = 0,
        reason;
      let killTimer;
      const stop = (code) => {
        reason = code;
        child.kill("SIGTERM");
        killTimer ??= setTimeout(() => child.kill("SIGKILL"), 5000);
      };
      const abort = () => stop("cancelled");
      signal?.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(() => stop("agent_timeout"), timeout);
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (data) => {
        bytes += Buffer.byteLength(data);
        if (bytes > 2 * 1024 * 1024) return stop("agent_output_limit");
        stdout += data.toString();
        pending += data.toString();
        const lines = pending.split("\n");
        pending = lines.pop();
        for (const line of lines) onLine?.(line);
      });
      // Provider errors can contain request details. Consume but never log them.
      child.stderr.on("data", (data) => {
        bytes += data.length;
        if (bytes > 2 * 1024 * 1024) stop("agent_output_limit");
      });
      child.stdin.on("error", () => {});
      child.stdin.end(input);
      const cleanup = () => {
        clearTimeout(timer);
        clearTimeout(killTimer);
        signal?.removeEventListener("abort", abort);
      };
      child.on("error", () => {
        cleanup();
        reject(new AgentExecutionError("runtime_unavailable"));
      });
      child.on("close", (code) => {
        cleanup();
        if (pending) onLine?.(pending);
        if (reason || code !== 0)
          reject(new AgentExecutionError(reason || "agent_execution_failed"));
        else resolve(stdout);
      });
    });
  }

  async metadata() {
    const metadata = JSON.parse(await readFile(this.metadataPath, "utf8"));
    if (
      !metadata.accountId ||
      !Number.isFinite(metadata.expiresAt) ||
      metadata.expiresAt * 1000 <= Date.now() + 60000
    ) {
      throw new AgentExecutionError("agent_login_expired");
    }
    return metadata;
  }

  async health() {
    await this.metadata();
    await this.command(["status"], { timeout: 10000 });
  }

  async remove(name) {
    await this.command(["sandbox", "delete", name], { timeout: 45000 });
  }

  async run({ name, prompt, signal, progress }) {
    const metadata = await this.metadata();
    progress("Starting agent");
    let answer = [],
      completed = false,
      failed = false;
    const args = [
      "sandbox",
      "create",
      "--name",
      name,
      "--from",
      this.image,
      "--provider",
      this.provider,
      "--no-auto-providers",
      "--detach",
      "--no-tty",
    ];
    if (this.model) args.push("--env", `CELLORAS_AGENT_MODEL=${this.model}`);
    args.push("--", "/bin/sleep", "infinity");
    try {
      await this.command(args, { signal, timeout: 180000 });
      progress("Thinking");
      await this.command(
        [
          "sandbox",
          "exec",
          name,
          "--no-tty",
          "--no-login-shell",
          "--timeout",
          "180",
          "--",
          "/usr/local/bin/celloras-codex",
        ],
        {
          input: JSON.stringify({ prompt, accountId: metadata.accountId }),
          signal,
          timeout: 190000,
          onLine(line) {
            let event;
            try {
              event = JSON.parse(line);
            } catch {
              return;
            }
            if (!event || typeof event !== "object") return;
            if (event.type === "turn.completed") completed = true;
            if (event.type === "turn.failed") failed = true;
            if (
              event.type === "item.completed" &&
              event.item?.type === "agent_message" &&
              typeof event.item.text === "string"
            ) {
              answer.push(event.item.text);
            }
          },
        },
      );
      // The schema applies to the final message, not interim agent commentary.
      const response = answer.at(-1)?.trim();
      if (!completed || failed || !response)
        throw new AgentExecutionError("agent_execution_failed");
      if (response.length > 64000)
        throw new AgentExecutionError("agent_output_limit");
      return parseAgentResponse(response);
    } finally {
      // A disconnected exec client does not prove the remote process stopped.
      // Always remove this exact turn's sandbox; caller records cleanup failure.
      try {
        await this.remove(name);
      } catch {
        throw new AgentExecutionError("sandbox_cleanup_failed");
      }
    }
  }
}
