import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChatTurn, ChatWorkspace } from "../app/core/chat";

const origin = "http://localhost:3100";
const headers = { origin };
const execute = promisify(execFile);
async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`chat-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(`${origin}/app`);
}

test("real OpenShell chat remembers owned context, persists, cancels and isolates accounts", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(300000);
  await register(page);
  const project = await page.request.post("/api/projects", {
    headers,
    data: { name: "Soybean agent conversation" },
  });
  expect(project.status()).toBe(201);
  const projectId = (await project.json()).id as string;
  const endpoint = `/api/projects/${projectId}/chat`;
  const research = await page.request.post(
    `/api/projects/${projectId}/research`,
    {
      headers,
      data: {
        submissionId: randomUUID(),
        command: {
          kind: "context",
          context: {
            speciesId: "glycine-max",
            tissue: "Root",
            sampleLabel: "Sample agent",
            developmentalStage: null,
            genomeVersion: null,
            geneIdNamespace: null,
            notes: "Researcher-supplied context",
          },
        },
      },
    },
  );
  expect(research.ok()).toBe(true);
  await expect
    .poll(
      async () =>
        ((await (await page.request.get(endpoint)).json()) as ChatWorkspace)
          .runtime.status,
      { timeout: 30000 },
    )
    .toBe("ready");
  await page.goto(`/app/projects/${projectId}`);
  const nonce = `SOYA-${randomBytes(5).toString("hex")}`;
  await page
    .getByLabel("Message Celloras", { exact: true })
    .fill(
      `Remember the note code ${nonce}. Reply with the code and the tissue from my saved sample context. Do not add scientific claims.`,
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const first = page.locator("[data-chat-turn-id]").first();
  await expect(first).toHaveAttribute("data-chat-status", /completed|failed/, {
    timeout: 180000,
  });
  await expect(first).toHaveAttribute("data-chat-status", "completed");
  await expect(first.locator('[data-chat-role="assistant"]')).toContainText(
    nonce,
  );
  await expect(first.locator('[data-chat-role="assistant"]')).toContainText(
    /root/i,
  );
  await page.reload();
  await expect(page.locator('[data-chat-role="assistant"]')).toContainText(
    nonce,
  );
  await page
    .getByLabel("Message Celloras", { exact: true })
    .fill(
      "What note code did I ask you to remember? Reply with only that code.",
    );
  await page.getByLabel("Message Celloras", { exact: true }).press("Enter");
  const second = page.locator("[data-chat-turn-id]").nth(1);
  await expect(second).toHaveAttribute("data-chat-status", /completed|failed/, {
    timeout: 180000,
  });
  await expect(second).toHaveAttribute("data-chat-status", "completed");
  await expect(second.locator('[data-chat-role="assistant"]')).toContainText(
    nonce,
  );

  const data = {
    submissionId: randomUUID(),
    prompt:
      "Explain ten next steps for planning a soybean single-cell experiment in detail.",
  };
  const submitted = await page.request.post(endpoint, { headers, data });
  expect(submitted.ok()).toBe(true);
  const turn: ChatTurn = await submitted.json();
  const replay = await page.request.post(endpoint, { headers, data });
  expect((await replay.json()).id).toBe(turn.id);
  expect(
    (
      await page.request.post(endpoint, {
        headers,
        data: { ...data, prompt: "Changed prompt" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post(endpoint, {
        headers,
        data: { ...data, submissionId: randomUUID() },
      })
    ).status(),
  ).toBe(409);
  await expect
    .poll(
      async () => {
        const result: ChatWorkspace = await (
          await page.request.get(endpoint)
        ).json();
        return result.turns.find((item) => item.id === turn.id)?.status;
      },
      { timeout: 30000 },
    )
    .toBe("running");
  const cancelled = await page.request.delete(endpoint, {
    headers,
    data: { turnId: turn.id },
  });
  expect(cancelled.ok()).toBe(true);
  await expect
    .poll(
      async () => {
        const result: ChatWorkspace = await (
          await page.request.get(endpoint)
        ).json();
        return result.turns.find((item) => item.id === turn.id)?.status;
      },
      { timeout: 60000 },
    )
    .toBe("cancelled");

  const foreign = await browser.newContext();
  const otherPage = await foreign.newPage();
  await register(otherPage);
  expect((await otherPage.request.get(endpoint)).status()).toBe(404);
  expect(
    (await otherPage.request.post(endpoint, { headers, data })).status(),
  ).toBe(404);
  expect(
    (
      await otherPage.request.delete(endpoint, {
        headers,
        data: { turnId: turn.id },
      })
    ).status(),
  ).toBe(404);
  await foreign.close();
  expect(
    (
      await page.request.post(endpoint, {
        headers: { origin: "https://unrelated.example" },
        data,
      })
    ).status(),
  ).toBe(403);
  await page.reload();
  const composer = page.getByRole("form", { name: "Message the agent" });
  await expect(composer).toBeInViewport();
  const scroller = page.getByLabel("Conversation messages", { exact: true });
  await scroller.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(composer).toBeInViewport();
  // Polling a saved conversation must not pull the reader back to the bottom.
  await page.waitForResponse(
    (response) =>
      response.url().endsWith(endpoint) &&
      response.request().method() === "GET",
  );
  expect(await scroller.evaluate((element) => element.scrollTop)).toBe(0);
  await page.screenshot({
    path: testInfo.outputPath("agent-chat-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(composer).toBeInViewport();
  await expect(
    page.getByText("Response cancelled", { exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("agent-chat-mobile.png"),
    fullPage: true,
  });
});

test("worker crash recovers without replay, and offline sends preserve the draft", async ({
  page,
}) => {
  test.setTimeout(180000);
  await register(page);
  const created = await page.request.post("/api/projects", {
    headers,
    data: { name: "Agent recovery check" },
  });
  const projectId = (await created.json()).id as string;
  const endpoint = `/api/projects/${projectId}/chat`;
  const data = {
    submissionId: randomUUID(),
    prompt:
      "Describe a careful plan for soybean single-cell analysis in detail.",
  };
  const accepted = await page.request.post(endpoint, { headers, data });
  expect(accepted.ok()).toBe(true);
  const turn: ChatTurn = await accepted.json();
  const workspace = async (): Promise<ChatWorkspace> =>
    (await page.request.get(endpoint)).json();
  try {
    await expect
      .poll(async () => (await workspace()).turns[0]?.status, {
        timeout: 15000,
        intervals: [100],
      })
      .toBe("running");
    await execute(
      "docker",
      ["compose", "kill", "-s", "SIGKILL", "agent-worker"],
      { timeout: 20000 },
    );
    await execute("docker", ["compose", "up", "-d", "agent-worker"], {
      timeout: 60000,
    });
    await expect
      .poll(async () => (await workspace()).turns[0]?.status, {
        timeout: 100000,
      })
      .toBe("failed");
    let saved = await workspace();
    expect(saved.turns).toHaveLength(1);
    expect(saved.turns[0].errorCode).toBe("worker_interrupted");
    expect(saved.turns[0].response).toBeNull();
    await execute("docker", ["compose", "stop", "agent-worker"], {
      timeout: 60000,
    });
    await expect
      .poll(async () => (await workspace()).runtime.status, { timeout: 35000 })
      .toBe("unavailable");
    const replay = await page.request.post(endpoint, { headers, data });
    expect(replay.ok()).toBe(true);
    expect((await replay.json()).id).toBe(turn.id);
    expect(
      (
        await page.request.post(endpoint, {
          headers,
          data: { ...data, submissionId: randomUUID() },
        })
      ).status(),
    ).toBe(503);
    await page.goto(`/app/projects/${projectId}`);
    await page
      .getByLabel("Message Celloras", { exact: true })
      .fill("Keep this draft while the agent is offline.");
    await expect(
      page.getByRole("button", { name: "Send message", exact: true }),
    ).toBeDisabled();
    await page.waitForResponse(
      (response) =>
        response.url().endsWith(endpoint) &&
        response.request().method() === "GET",
    );
    await expect(
      page.getByLabel("Message Celloras", { exact: true }),
    ).toHaveValue("Keep this draft while the agent is offline.");
    saved = await workspace();
    expect(saved.turns).toHaveLength(1);
  } finally {
    await execute("docker", ["compose", "up", "-d", "agent-worker"], {
      timeout: 60000,
    });
    await expect
      .poll(async () => (await workspace()).runtime.status, { timeout: 35000 })
      .toBe("ready");
  }
});
