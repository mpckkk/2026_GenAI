import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import type { ChatTurn, ChatWorkspace } from "../app/core/chat";
import type {
  AnnotationResult,
  AnnotationReview,
} from "../app/core/annotation";

const headers = { origin: "http://localhost:3100" };

async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`annotation-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
}

async function completedTurn(page: Page, projectId: string, after: number) {
  let turn: ChatTurn | undefined;
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/projects/${projectId}/chat`,
        );
        expect(response.ok()).toBe(true);
        const workspace: ChatWorkspace = await response.json();
        turn = workspace.turns.at(-1);
        return (
          workspace.turns.length > after &&
          turn &&
          ["completed", "failed", "cancelled"].includes(turn.status)
        );
      },
      { timeout: 240000, intervals: [1800, 2500] },
    )
    .toBe(true);
  expect(
    turn!.status,
    JSON.stringify({ status: turn!.status, error: turn!.errorCode }),
  ).toBe("completed");
  return turn!;
}

async function annotationRun(page: Page, projectId: string, turn: ChatTurn) {
  const block = turn.responseDocument?.blocks.find(
    (item) => item.type === "annotation_result",
  );
  if (block?.type !== "annotation_result")
    throw new Error("The real annotation tool did not return its result card.");
  const endpoint = `/api/projects/${projectId}/analyses/${block.result.id}`;
  const response = await page.request.get(endpoint);
  expect(response.ok()).toBe(true);
  const run: {
    id: string;
    result: AnnotationResult;
    annotationReviews: AnnotationReview[];
  } = await response.json();
  expect(run.result.operation).toBe("annotation");
  expect(run.result.dataset.artifactVersion).toMatch(/^[a-f0-9]{64}$/);
  expect(run.result.payload.reference.sha256).toMatch(/^[a-f0-9]{64}$/);
  const card = page.locator(`[data-analysis-id="${run.id}"]`).last();
  await card.scrollIntoViewIfNeeded();
  await expect(
    card.getByRole("heading", {
      name: "Review the cell-type evidence",
      exact: true,
    }),
  ).toBeVisible({ timeout: 30000 });
  return { run, card, endpoint };
}

test("real annotation candidates, evidence, durable decisions and authenticated boundaries", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(700000);
  await register(page);
  const demoOpened = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/demo" &&
      response.request().method() === "POST",
    { timeout: 30000 },
  );
  await page
    .getByRole("button", { name: "Explore soybean root demo", exact: true })
    .click();
  const demoResponse = await demoOpened;
  expect(demoResponse.ok(), await demoResponse.text()).toBe(true);
  await expect(page).toHaveURL(/\/app\/projects\/[a-f0-9-]+$/, {
    timeout: 60000,
  });
  const projectId = page.url().split("/").at(-1)!;
  await expect(page.getByText("Agent connected", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const composer = page.getByLabel("Message Celloras", { exact: true });
  await composer.fill("Keep this question while I review the evidence.");
  await page.getByRole("button", { name: /^Annotate all clusters/ }).click();
  const guided = await completedTurn(page, projectId, 0);
  expect(guided.action).toMatchObject({
    operation: "annotation",
    datasetId: "gse270392-root-rna-v1",
  });
  await expect(composer).toHaveValue(
    "Keep this question while I review the evidence.",
  );
  const { run, card, endpoint } = await annotationRun(page, projectId, guided);
  const result = run.result;
  expect(result.payload.clusters).toHaveLength(12);
  expect(result.payload.clusters.reduce((sum, c) => sum + c.nCells, 0)).toBe(
    7496,
  );
  expect(result.payload.reference.genomeBuild).toBe(result.dataset.genomeBuild);
  expect(result.payload.validation.status).toBe("not_independently_validated");
  expect(result.payload.validation.independentAccuracy).toBeNull();
  expect(
    result.summary.suggestedCount +
      result.summary.ambiguousCount +
      result.summary.unresolvedCount,
  ).toBe(12);
  const cluster = result.payload.clusters.find((c) => c.cluster === "6")!;
  expect(cluster.nCells).toBe(388);
  const rootHair = cluster.candidates.find((c) => c.cellType === "Root hair");
  expect(
    rootHair,
    "The compatible published root-hair marker set must be available.",
  ).toBeDefined();
  expect(rootHair!.supportingGenes.length).toBeGreaterThan(0);
  expect(
    rootHair!.supportingGenes.every(
      (g) =>
        g.assessment === "supports" &&
        g.sourceRows.length > 0 &&
        g.sourceUrl.startsWith("https://"),
    ),
  ).toBe(true);
  await card.getByRole("button", { name: /^Cluster 0\b/ }).click();
  await expect(
    page.getByRole("button", { name: "Clear selected cluster 0", exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: /^Cluster 6\b/ }).click();
  await expect(
    page.getByRole("button", { name: "Clear selected cluster 6", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clear selected cluster 0", exact: true }),
  ).toHaveCount(0);
  await expect(
    card.getByRole("heading", { name: "Cluster 6", exact: true }),
  ).toBeVisible();
  const candidateSummary = card
    .locator("summary")
    .filter({ hasText: "Root hair" })
    .first();
  await candidateSummary.click();
  const candidateDetails = candidateSummary.locator("..");
  await candidateDetails
    .locator("summary")
    .filter({ hasText: /^Supporting genes \(/ })
    .first()
    .click();
  const evidenceGene = rootHair!.supportingGenes[0];
  const geneRow = candidateDetails.getByRole("row").filter({
    has: page.getByRole("button", {
      name: `${evidenceGene.geneId} ↗`,
      exact: true,
    }),
  });
  await expect(geneRow).toBeVisible();
  await geneRow
    .locator("summary")
    .filter({ hasText: "Exact values & source" })
    .click();
  await expect(geneRow).toContainText(evidenceGene.sourceGeneId);
  await expect(
    geneRow.getByRole("link", { name: "Open marker source ↗", exact: true }),
  ).toHaveAttribute("href", evidenceGene.sourceUrl);
  await card
    .locator("summary")
    .filter({ hasText: "Reference, method and validation" })
    .click();
  await expect(
    card.getByText("Not independently validated.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("annotation-evidence-desktop.png"),
  });

  // A real UI save yields the request identity used to verify response-loss replay.
  await card
    .locator("summary")
    .filter({ hasText: "Review and save a decision" })
    .click();
  const reviewForm = card.getByRole("form", {
    name: "Review annotation for cluster 6",
    exact: true,
  });
  await reviewForm
    .getByLabel("What do you conclude?", { exact: true })
    .selectOption("accepted");
  await reviewForm
    .getByLabel("Candidate cell type", { exact: true })
    .selectOption("Root hair");
  const acceptedNote = `Provisional root-hair interpretation supported by ${evidenceGene.geneId}. Marker evidence is not independent validation.`;
  await reviewForm
    .getByLabel("Evidence and reasoning", { exact: true })
    .fill(acceptedNote);
  const saveResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(`${endpoint}/annotation-review`) &&
      r.request().method() === "POST",
  );
  await reviewForm
    .getByRole("button", { name: "Save annotation decision", exact: true })
    .click();
  const savedResponse = await saveResponse;
  expect(savedResponse.ok(), await savedResponse.text()).toBe(true);
  const acceptedRequest = savedResponse.request().postDataJSON();
  const accepted: AnnotationReview = (await savedResponse.json()).review;
  expect(accepted).toMatchObject({
    cluster: "6",
    decision: "accepted",
    cellType: "Root hair",
    note: acceptedNote,
  });
  await expect(
    card.getByText("Saved annotation decision", { exact: true }),
  ).toBeVisible();
  await expect(card).toContainText(acceptedNote);
  const replay = await page.request.post(`${endpoint}/annotation-review`, {
    headers,
    data: acceptedRequest,
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).review.id).toBe(accepted.id);
  expect(
    (
      await page.request.post(
        `${endpoint.replace(run.id, run.id.toUpperCase())}/annotation-review`,
        { headers, data: acceptedRequest },
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(`${endpoint}/annotation-review`, {
        headers,
        data: { ...acceptedRequest, note: "Changed retry" },
      })
    ).status(),
  ).toBe(409);

  await page.reload();
  const restored = page.locator(`[data-analysis-id="${run.id}"]`).last();
  await restored.scrollIntoViewIfNeeded();
  await restored.getByRole("button", { name: /^Cluster 6\b/ }).click();
  await expect(restored.getByText(acceptedNote, { exact: true })).toBeVisible();
  await restored
    .locator("summary")
    .filter({ hasText: "Add another decision" })
    .click();
  const correction = restored.getByRole("form", {
    name: "Review annotation for cluster 6",
    exact: true,
  });
  await correction
    .getByLabel("What do you conclude?", { exact: true })
    .selectOption("corrected");
  const ownLabel = "Root-hair-like population — researcher review pending";
  const correctionNote =
    "Retain a qualified working label until independent evidence and sample context are reviewed.";
  await correction
    .getByLabel("Your cell-type label", { exact: true })
    .fill(ownLabel);
  await correction
    .getByLabel("Evidence and reasoning", { exact: true })
    .fill(correctionNote);
  const correctionResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(`${endpoint}/annotation-review`) &&
      r.request().method() === "POST",
  );
  await correction
    .getByRole("button", { name: "Save annotation decision", exact: true })
    .click();
  expect((await correctionResponse).ok()).toBe(true);
  await expect(
    restored.getByText(correctionNote, { exact: true }),
  ).toBeVisible();
  await restored
    .locator("summary")
    .filter({ hasText: "Recent decisions (1 earlier)" })
    .click();
  await expect(restored.getByText(acceptedNote, { exact: true })).toBeVisible();
  const updated = await (await page.request.get(endpoint)).json();
  expect(updated.result).toEqual(result);
  expect(updated.annotationReviews).toHaveLength(2);
  expect(updated.annotationReviews[0]).toMatchObject({
    decision: "corrected",
    cellType: ownLabel,
    note: correctionNote,
  });
  expect(updated.annotationReviews[1]).toMatchObject({
    id: accepted.id,
    decision: "accepted",
    cellType: "Root hair",
  });

  for (const invalid of [
    { cellType: "Invented label absent from the reference" },
    { cluster: "999" },
    { decision: ["accepted"] },
    { decision: "unresolved", cellType: "Root hair" },
    { note: "" },
    { evidence: { score: 1 } },
  ]) {
    expect(
      (
        await page.request.post(`${endpoint}/annotation-review`, {
          headers,
          data: { ...acceptedRequest, submissionId: randomUUID(), ...invalid },
        })
      ).status(),
    ).toBe(400);
  }
  expect(
    (
      await page.request.post(`${endpoint}/annotation-review`, {
        headers: { origin: "https://untrusted.example" },
        data: acceptedRequest,
      })
    ).status(),
  ).toBe(403);
  const replayAction = await page.request.post(
    `/api/projects/${projectId}/chat`,
    {
      headers,
      data: {
        submissionId: guided.submissionId,
        prompt: guided.prompt,
        action: guided.action,
      },
    },
  );
  expect(replayAction.status()).toBe(200);
  expect((await replayAction.json()).id).toBe(guided.id);
  expect(
    (
      await page.request.post(`/api/projects/${projectId}/chat`, {
        headers,
        data: {
          submissionId: guided.submissionId,
          prompt: guided.prompt,
          action: { ...guided.action, cluster: "6" },
        },
      })
    ).status(),
  ).toBe(409);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobile = page.locator(`[data-analysis-id="${run.id}"]`).last();
  await mobile.scrollIntoViewIfNeeded();
  await mobile.getByRole("button", { name: /^Cluster 6\b/ }).click();
  await expect(mobile.getByText(correctionNote, { exact: true })).toBeVisible();
  await mobile
    .locator("summary")
    .filter({ hasText: "Recent decisions (1 earlier)" })
    .click();
  await expect(mobile.getByText(acceptedNote, { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("annotation-review-mobile.png"),
  });

  await mobile
    .getByRole("button", {
      name: "Draft a question about this decision",
      exact: true,
    })
    .click();
  await expect(composer).toHaveValue(
    new RegExp(`Saved annotation run: ${run.id}.*`, "s"),
  );
  await expect(composer).toHaveValue(/source cluster 6/);
  // No action is submitted here: the model must request the connected tool itself.
  await composer.fill(
    "Run a fresh annotation for source cluster 6 using the connected annotation tool for this soybean root dataset. Show the new annotation result card and explain its limitations. Do not only summarize the previous saved run.",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const autonomous = await completedTurn(page, projectId, 1);
  expect(autonomous.action ?? null).toBeNull();
  expect(autonomous.prompt).toContain("Selected source cluster: 6");
  expect(autonomous.prompt).not.toContain("Selected source cluster: 0");
  const fresh = await annotationRun(page, projectId, autonomous);
  expect(fresh.run.id).not.toBe(run.id);
  expect(fresh.run.result.payload.clusters.map((c) => c.cluster)).toEqual([
    "6",
  ]);
  expect(fresh.run.annotationReviews).toHaveLength(0);
  expect(fresh.run.result.payload.clusters[0]).toEqual(cluster);
  expect(
    (await (await page.request.get(endpoint)).json()).annotationReviews,
  ).toHaveLength(2);
  await page.screenshot({
    path: info.outputPath("annotation-agent-tool-mobile.png"),
  });

  const other = await browser.newContext();
  try {
    const outsider = await other.newPage();
    await register(outsider);
    expect((await outsider.request.get(endpoint)).status()).toBe(404);
    expect(
      (
        await outsider.request.post(`${endpoint}/annotation-review`, {
          headers,
          data: acceptedRequest,
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await outsider.request.post(`/api/projects/${projectId}/chat`, {
          headers,
          data: {
            submissionId: randomUUID(),
            prompt: "Annotate",
            action: { operation: "annotation", datasetId: result.dataset.id },
          },
        })
      ).status(),
    ).toBe(404);
    const own = await outsider.request.post("/api/demo", { headers, data: {} });
    expect((await own.json()).projectId).not.toBe(projectId);
  } finally {
    await other.close();
  }
});
