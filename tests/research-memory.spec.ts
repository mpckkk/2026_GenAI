import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import type { ChatTurn, ChatWorkspace } from "../app/core/chat";

const headers = { origin: "http://localhost:3100" };
async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`memory-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
}
async function ask(page: Page, projectId: string, prompt: string) {
  const submit = await page.request.post(`/api/projects/${projectId}/chat`, {
    headers,
    data: { submissionId: randomUUID(), prompt },
  });
  expect(submit.ok(), await submit.text()).toBe(true);
  const submitted = await submit.json();
  let turn: ChatTurn | undefined;
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/projects/${projectId}/chat`,
        );
        expect(response.ok()).toBe(true);
        const workspace: ChatWorkspace = await response.json();
        turn = workspace.turns.find((item) => item.id === submitted.id);
        return (
          turn && ["completed", "failed", "cancelled"].includes(turn.status)
        );
      },
      { timeout: 240000, intervals: [2000] },
    )
    .toBe(true);
  expect(turn?.status, turn?.errorCode ?? "").toBe("completed");
  return turn!;
}

test("H-MEM recalls old owned reviews, preserves sources, and supersedes only the same group", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(600000);
  await register(page);
  const created = await page.request.post("/api/projects", {
    headers,
    data: { name: "Research memory acceptance" },
  });
  expect(created.status()).toBe(201);
  const projectId: string = (await created.json()).id;
  const post = async (command: unknown) => {
    const response = await page.request.post(
      `/api/projects/${projectId}/research`,
      { headers, data: { submissionId: randomUUID(), command } },
    );
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  };
  const marker = await post({
    kind: "markers",
    speciesId: "glycine-max",
    label: "Orchid calibration group",
    markersRaw: "Glyma.01G000100",
    contextEntryId: null,
  });
  const original = await post({
    kind: "manual_review",
    markerEntryId: marker.id,
    cellType: "Root hair",
    evidenceText:
      "Illustrative researcher decision for memory acceptance, not scientific validation.",
    notes:
      "Orchid calibration group: keep Root hair provisional pending independent validation.",
  });
  // Move both marker/review out of the worker's thirty recent research records.
  for (let i = 0; i < 32; i++)
    await post({
      kind: "message",
      text: `Unrelated laboratory housekeeping note ${i}.`,
    });
  const first = await ask(
    page,
    projectId,
    "Orchid calibration group Root hair provisional: what did I previously decide? Use my saved decision and cite its source. Do not run new analysis.",
  );
  expect(first.recalledDecisions?.map((d) => d.source)).toContain(
    `research-review:${original.id}`,
  );
  expect(first.response).toMatch(/root hair/i);
  expect(first.recalledDecisions?.[0].content).toContain(
    "independent validation",
  );
  await page.goto(`/app/projects/${projectId}`);
  const receipt = page
    .locator(`[data-chat-turn-id="${first.id}"] details`)
    .filter({ hasText: "Recalled 1 saved decision" });
  await receipt.locator("summary").click();
  const source = receipt.getByRole("link", {
    name: "Root hair · Orchid calibration group",
  });
  await expect(source).toBeVisible();
  await page.screenshot({
    path: info.outputPath("hmem-recalled-decision.png"),
  });
  await source.click();
  await expect(page.locator(`#entry-${original.id}`)).toBeVisible();

  const correction = await post({
    kind: "manual_review",
    markerEntryId: marker.id,
    cellType: null,
    evidenceText: "The researcher withdrew the earlier label.",
    notes:
      "Orchid calibration group is unresolved. Actually, withdraw Root hair until independent validation is available.",
  });
  const controlMarker = await post({
    kind: "markers",
    speciesId: "glycine-max",
    label: "Orchid control group",
    markersRaw: "Glyma.01G000100",
    contextEntryId: null,
  });
  const controlReview = await post({
    kind: "manual_review",
    markerEntryId: controlMarker.id,
    cellType: "Cortex",
    evidenceText:
      "Illustrative separate-group decision for isolation acceptance.",
    notes:
      "Orchid control group: actually retain Cortex provisionally pending independent validation.",
  });
  const second = await ask(
    page,
    projectId,
    "Orchid calibration group and Orchid control group: compare my latest saved decisions. Check my saved reviews; do not run analysis.",
  );
  expect(second.recalledDecisions?.map((d) => d.source)).toContain(
    `research-review:${correction.id}`,
  );
  expect(second.recalledDecisions?.map((d) => d.source)).not.toContain(
    `research-review:${original.id}`,
  );
  expect(second.response).toMatch(/unresolved|withdra/i);
  expect(second.recalledDecisions?.map((d) => d.source)).toContain(
    `research-review:${controlReview.id}`,
  );
  expect(second.response).toMatch(/Cortex/i);
  // The earlier answer keeps its original memory receipt after the correction.
  await page.reload();
  const persisted: ChatWorkspace = await (
    await page.request.get(`/api/projects/${projectId}/chat`)
  ).json();
  expect(
    persisted.turns.find((t) => t.id === first.id)?.recalledDecisions,
  ).toEqual(first.recalledDecisions);
  expect(
    persisted.turns.find((t) => t.id === second.id)?.recalledDecisions,
  ).toEqual(second.recalledDecisions);

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  try {
    await register(other);
    expect(
      (await other.request.get(`/api/projects/${projectId}/chat`)).status(),
    ).toBe(404);
    expect(
      (
        await other.request.post(`/api/projects/${projectId}/chat`, {
          headers,
          data: {
            submissionId: randomUUID(),
            prompt: "Orchid calibration group",
          },
        })
      ).status(),
    ).toBe(404);
    const empty = await other.request.post("/api/projects", {
      headers,
      data: { name: "Isolated memory" },
    });
    const emptyId: string = (await empty.json()).id;
    const isolated = await ask(
      other,
      emptyId,
      "Orchid calibration group: what did I previously decide? Use saved decisions only, do not run analysis.",
    );
    expect(isolated.recalledDecisions).toEqual([]);
  } finally {
    await otherContext.close();
  }
  console.log(
    JSON.stringify({
      event: "memory.journey.completed",
      projectId,
      turnIds: [first.id, second.id],
      sources: [original.id, correction.id],
    }),
  );
});
