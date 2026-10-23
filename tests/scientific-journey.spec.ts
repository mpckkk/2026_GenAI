import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import type { ChatWorkspace, ChatTurn } from "../app/core/chat";
import type { ScientificResult } from "../app/core/scientific-data";
const headers = { origin: "http://localhost:3100" };
async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`science-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
}
async function finished(
  page: Page,
  projectId: string,
  previous: number,
): Promise<ChatTurn> {
  let last: ChatTurn | undefined;
  await expect
    .poll(
      async () => {
        const r = await page.request.get(`/api/projects/${projectId}/chat`);
        expect(r.ok()).toBe(true);
        const w: ChatWorkspace = await r.json();
        last = w.turns.at(-1);
        return (
          w.turns.length > previous &&
          last &&
          ["completed", "failed", "cancelled"].includes(last.status)
        );
      },
      { timeout: 240000, intervals: [1800, 2500] },
    )
    .toBe(true);
  expect(
    last!.status,
    JSON.stringify({ status: last!.status, error: last!.errorCode }),
  ).toBe("completed");
  return last!;
}
async function scientificResult(
  page: Page,
  id: string,
  turn: ChatTurn,
  operation: string,
) {
  const block = turn.responseDocument?.blocks.find(
    (b) =>
      b.type === "scientific_result" && b.result.result.operation === operation,
  );
  if (block?.type !== "scientific_result")
    throw new Error(`Missing real ${operation} card`);
  const response = await page.request.get(
    `/api/projects/${id}/analyses/${block.result.id}`,
  );
  expect(response.ok()).toBe(true);
  const run = await response.json();
  expect(run.result.dataset.artifactVersion).toMatch(/^[a-f0-9]{64}$/);
  const card = page.locator(`[data-analysis-id="${run.id}"]`).last();
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole("status")).toHaveCount(0, { timeout: 30000 });
  return { run, card, result: run.result as ScientificResult };
}
test("guided real soybean journey, agent tools, source citations, saved reviews and ownership", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(1000000);
  await register(page);
  await expect(
    page.getByRole("button", { name: "Explore soybean root demo" }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("guided-start-desktop.png") });
  await page.getByRole("button", { name: "Explore soybean root demo" }).click();
  await expect(page).toHaveURL(/\/app\/projects\/[a-f0-9-]+$/, {
    timeout: 60000,
  });
  const id = page.url().split("/").at(-1)!;
  const replay = await page.request.post("/api/demo", { headers, data: {} });
  expect((await replay.json()).projectId).toBe(id);
  await expect(page.getByText("Agent connected", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const composer = page.getByLabel("Message Celloras", { exact: true });
  await composer.fill("Keep my draft while I explore.");
  await page.getByRole("button", { name: /^Explore cell groups/ }).click();
  const overview = await finished(page, id, 0);
  await expect(composer).toHaveValue("Keep my draft while I explore.");
  const inspect = await scientificResult(page, id, overview, "inspect");
  expect(inspect.result.dataset.nCells).toBe(7496);
  expect(inspect.result.operation).toBe("inspect");
  if (inspect.result.operation !== "inspect") throw new Error("Wrong tool");
  expect(inspect.result.payload.embedding.points).toHaveLength(7496);
  expect(inspect.result.payload.clusters).toHaveLength(12);
  await inspect.card.getByRole("button", { name: /^Cluster 6\b/ }).click();
  await inspect.card
    .getByRole("button", { name: /^Find markers for cluster 6/ })
    .click();
  const markerTurn = await finished(page, id, 1);
  const markers = await scientificResult(page, id, markerTurn, "markers");
  expect(markers.result.operation).toBe("markers");
  if (markers.result.operation !== "markers") throw new Error("Wrong tool");
  expect(markers.result.payload.cluster).toBe("6");
  expect(markers.result.payload.nCells).toBe(388);
  expect(markers.result.payload.markers[0].geneId).toBe("Glyma.07G139700");
  expect(markers.result.method.parameters.statisticalTest).toBe(false);
  await page.screenshot({ path: info.outputPath("real-markers-desktop.png") });
  await markers.card.getByRole("button", { name: /^Glyma\.07G139700/ }).click();
  const expressionTurn = await finished(page, id, 2);
  const expression = await scientificResult(
    page,
    id,
    expressionTurn,
    "expression",
  );
  if (expression.result.operation !== "expression")
    throw new Error("Wrong tool");
  expect(expression.result.payload.embedding.points).toHaveLength(7496);
  expect(
    expression.result.payload.embedding.points.some(
      (p) => (p.rawCount ?? 0) > 0,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("real-expression-desktop.png"),
  });
  await markers.card
    .getByRole("button", { name: /^Compare top genes across clusters/ })
    .click();
  const dotTurn = await finished(page, id, 3);
  const dots = await scientificResult(page, id, dotTurn, "dotplot");
  if (dots.result.operation !== "dotplot") throw new Error("Wrong tool");
  expect(dots.result.payload.values).toHaveLength(72);
  await page.screenshot({ path: info.outputPath("real-dotplot-desktop.png") });
  await composer.fill(
    "Find cited papers describing the soybean root atlas annotation methods and limitations. Use the connected literature tool without a gene filter. Show the sources card and explain what these papers cannot establish.",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const literatureTurn = await finished(page, id, 4);
  const block = literatureTurn.responseDocument?.blocks.find(
    (b) => b.type === "literature_result",
  );
  expect(block?.type).toBe("literature_result");
  if (block?.type !== "literature_result")
    throw new Error("Agent did not request literature");
  expect(block.result.result.results.length).toBeGreaterThan(0);
  expect(block.result.result.filters.genomeVersion).toBe("Wm82v4");
  expect(
    block.result.result.results.every(
      (hit) => hit.genomeVersion === null || hit.genomeVersion === "Wm82v4",
    ),
  ).toBe(true);
  const papers = page.locator(`[data-analysis-id="${block.result.id}"]`).last();
  await papers.scrollIntoViewIfNeeded();
  await expect(
    papers.getByRole("link", { name: "Read source passage ↗" }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("cited-evidence-desktop.png"),
  });
  await markers.card.scrollIntoViewIfNeeded();
  await markers.card
    .getByText("Save my interpretation", { exact: true })
    .click();
  const note =
    "Cluster 6 remains unresolved. Descriptive enrichment needs compatible marker evidence and sample review.";
  await markers.card.getByRole("textbox").fill(note);
  await markers.card
    .getByRole("button", { name: "Save interpretation", exact: true })
    .click();
  await expect(
    markers.card.getByRole("heading", {
      name: "Your saved interpretation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(markers.card).toContainText(note);
  const endpoint = `/api/projects/${id}/analyses/${markers.run.id}`;
  const stored = await (await page.request.get(endpoint)).json();
  expect(stored.reviews[0].decision).toBe("uncertain");
  expect(stored.reviews[0].cluster).toBe("6");
  const review = {
    submissionId: randomUUID(),
    decision: "uncertain",
    note: "Independent saved review",
    cluster: "6",
  };
  const first = await page.request.post(`${endpoint}/review`, {
    headers,
    data: review,
  });
  expect(first.ok(), await first.text()).toBe(true);
  const repeat = await page.request.post(`${endpoint}/review`, {
    headers,
    data: review,
  });
  expect((await repeat.json()).review.id).toBe((await first.json()).review.id);
  expect(
    (
      await page.request.post(`${endpoint}/review`, {
        headers,
        data: { ...review, note: "Changed" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post(`${endpoint}/review`, {
        headers,
        data: { ...review, submissionId: randomUUID(), cluster: "999" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(`${endpoint}/review`, {
        headers: { origin: "https://untrusted.example" },
        data: review,
      })
    ).status(),
  ).toBe(403);
  const uppercaseReplay = await page.request.post(
    `/api/projects/${id}/analyses/${markers.run.id.toUpperCase()}/review`,
    { headers, data: review },
  );
  expect(uppercaseReplay.status()).toBe(200);
  expect(
    (
      await page.request.post(`${endpoint}/review`, {
        headers,
        data: {
          ...review,
          submissionId: randomUUID(),
          decision: ["supported"],
        },
      })
    ).status(),
  ).toBe(400);
  // Exact action is part of submission identity, including after the turn finished.
  expect(
    (
      await page.request.post(`/api/projects/${id}/chat`, {
        headers,
        data: {
          submissionId: overview.submissionId,
          prompt: overview.prompt,
          action: overview.action,
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(`/api/projects/${id}/chat`, {
        headers,
        data: {
          submissionId: overview.submissionId,
          prompt: overview.prompt,
          action: { operation: "inspect", datasetId: "not-attached" },
        },
      })
    ).status(),
  ).toBe(409);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page
    .locator(`[data-analysis-id="${markers.run.id}"]`)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(
    page.locator(`[data-analysis-id="${markers.run.id}"]`).first(),
  ).toContainText("Independent saved review");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("saved-review-mobile.png") });
  const other = await browser.newContext();
  const outsider = await other.newPage();
  await register(outsider);
  expect((await outsider.request.get(endpoint)).status()).toBe(404);
  expect(
    (
      await outsider.request.post(`${endpoint}/review`, {
        headers,
        data: review,
      })
    ).status(),
  ).toBe(404);
  const own = await outsider.request.post("/api/demo", { headers, data: {} });
  expect((await own.json()).projectId).not.toBe(id);
  await other.close();
});
