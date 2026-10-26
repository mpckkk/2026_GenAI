import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type {
  ActivityKind,
  ActivityList,
  ActivityRunDetail,
} from "../app/core/activity";
import type { ChatTurn, SubmitChatInput } from "../app/core/chat";
import type { AnnotationResult } from "../app/core/annotation";
import { verifiedReference } from "../app/adapters/annotation-engine.mjs";

const origin = "http://localhost:3100";
const headers = { origin };

async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`activity-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(`${origin}/app`, { timeout: 30000 });
}

async function submit(page: Page, projectId: string, input: SubmitChatInput) {
  const response = await page.request.post(`/api/projects/${projectId}/chat`, {
    headers,
    data: input,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as ChatTurn;
}

async function activity(page: Page, turnId: string) {
  const response = await page.request.get(`/api/activity/${turnId}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  return (await response.json()) as ActivityRunDetail;
}

async function finished(page: Page, turnId: string) {
  let detail: ActivityRunDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await activity(page, turnId);
        return ["completed", "failed", "cancelled"].includes(detail.run.status);
      },
      { timeout: 300000, intervals: [1500] },
    )
    .toBe(true);
  return detail!;
}

async function cancelled(page: Page, projectId: string, turnId: string) {
  const response = await page.request.delete(
    `/api/projects/${projectId}/chat`,
    {
      headers,
      data: { turnId: turnId },
    },
  );
  expect(response.ok(), await response.text()).toBe(true);
  const detail = await finished(page, turnId);
  expect(detail.run.status).toBe("cancelled");
  expect(detail.response).toBeNull();
  expect(detail.results).toEqual([]);
  expect(detail.events.some((event) => event.phase === "cancelled")).toBe(true);
  return detail;
}

function completedSpan(detail: ActivityRunDetail, kind: ActivityKind) {
  const terminal = detail.events.find(
    (event) => event.kind === kind && event.phase === "completed",
  );
  expect(terminal, `Missing completed ${kind} activity`).toBeDefined();
  expect(
    detail.events.some(
      (event) => event.spanId === terminal!.spanId && event.phase === "started",
    ),
    `The ${kind} step must retain its actual start receipt`,
  ).toBe(true);
  expect(terminal!.durationMs).toBeGreaterThanOrEqual(0);
  return terminal!;
}

test("owned activity records real annotation, source verification, memory, cancellation and durable visual receipts", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(780000);
  page.setDefaultTimeout(30000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await register(page);
  // A new account receives a fresh owned project with the verified public matrix.
  const opened = await page.request.post("/api/demo", { headers, data: {} });
  expect(opened.ok(), await opened.text()).toBe(true);
  const { projectId } = (await opened.json()) as { projectId: string };
  const nonce = `ACT-${randomBytes(5).toString("hex")}`;
  const prompt = `${nonce}: Annotate all soybean root cell groups with the connected annotation tool. Show the saved annotation card and explain the evidence and unresolved groups. Do not run another analysis after the requested action.`;
  const request: SubmitChatInput = {
    submissionId: randomUUID(),
    prompt,
    action: { operation: "annotation", datasetId: "gse270392-root-rna-v1" },
  };
  const submitted = await submit(page, projectId, request);
  const first = await activity(page, submitted.id);
  expect(first.run.recordingVersion).toBe(1);
  expect(first.run.projectId).toBe(projectId);
  expect(first.events.some((event) => event.kind === "queue")).toBe(true);

  await page.goto(`/app/activity/${submitted.id}`);
  await expect(
    page.getByRole("heading", { name: "Request activity" }),
  ).toBeVisible();
  await expect(page.getByText("Updating live", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.locator(
      '[data-activity-kind="model"][data-activity-status="running"]',
    ),
  ).toBeVisible({ timeout: 120000 });
  await page.screenshot({
    path: info.outputPath("01-live-annotation.png"),
    fullPage: true,
  });

  // The single real worker is busy with annotation. Cancel a separately owned
  // queued request before it can execute; this does not stop the worker/service.
  const created = await page.request.post("/api/projects", {
    headers,
    data: { name: `Activity cancellation ${nonce}` },
  });
  expect(created.status()).toBe(201);
  const cancellationProject = (await created.json()).id as string;
  const queued = await submit(page, cancellationProject, {
    submissionId: randomUUID(),
    prompt: `Queue cancellation ${nonce}: explain a proposed analysis in detail.`,
  });
  expect(queued.status).toBe("queued");
  const queuedCancelled = await cancelled(page, cancellationProject, queued.id);
  expect(queuedCancelled.events.some((event) => event.kind === "model")).toBe(
    false,
  );

  let complete = await finished(page, submitted.id);
  expect(complete.run.status, complete.run.errorCode ?? "").toBe("completed");
  expect(complete.run.toolCount).toBeGreaterThanOrEqual(1);
  expect(complete.run.runtime).toBe("openshell");
  expect(complete.run.durationMs).toBeGreaterThan(0);
  for (const kind of [
    "context",
    "memory",
    "model",
    "tool",
    "reference",
    "response",
  ] as const)
    completedSpan(complete, kind);
  const reference = complete.events.find(
    (event) =>
      event.kind === "reference" &&
      event.phase === "completed" &&
      event.data.reference &&
      complete.events.some(
        (parent) =>
          parent.kind === "tool" && parent.spanId === event.parentSpanId,
      ),
  );
  expect(
    reference,
    "The annotation tool must retain its actual source retrieval",
  ).toBeDefined();
  expect(reference!.data.reference?.contentSha256).toBe(
    verifiedReference().contentSha256,
  );
  expect(reference!.data.reference?.provider).toBeTruthy();
  expect(reference!.data.reference?.recordCount).toBeGreaterThan(0);
  expect(complete.dataset).toMatchObject({ id: "gse270392-root-rna-v1" });
  expect(complete.dataset?.artifactVersion).toMatch(/^[a-f0-9]{64}$/);
  const annotation = complete.results.find(
    (result) => result.operation === "annotation",
  );
  expect(annotation).toBeDefined();
  expect(
    complete.events.some(
      (event) =>
        event.kind === "tool" && event.data.resultId === annotation!.id,
    ),
  ).toBe(true);
  const canonicalHref = `/app/projects/${projectId}?chatBefore=${BigInt(complete.run.position) + 1n}#turn-${submitted.id}`;
  expect(annotation!.href).toBe(canonicalHref);
  expect(complete.response?.href).toBe(canonicalHref);
  expect(complete.response?.text).toBeTruthy();
  const resultEndpoint = `/api/projects/${projectId}/analyses/${annotation!.id}`;
  const resultResponse = await page.request.get(resultEndpoint);
  expect(resultResponse.status()).toBe(200);
  const canonical = (await resultResponse.json()) as {
    result: AnnotationResult;
  };
  expect(canonical.result.payload.clusters).toHaveLength(12);
  // The original source workbook checksum and the normalized reference
  // document checksum are different provenance layers, both retained intact.
  expect(canonical.result.payload.reference.sha256).toBe(
    verifiedReference().reference.sha256,
  );

  await expect(
    page.getByRole("heading", { name: "Saved results", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  const results = page.getByRole("region", {
    name: "Saved results",
    exact: true,
  });
  await expect(
    results.getByRole("link", { name: /Cell-type annotation/ }),
  ).toHaveAttribute("href", canonicalHref);
  const referenceStep = page
    .locator('[data-activity-kind="reference"]')
    .filter({
      has: page.getByRole("heading", { name: reference!.name, exact: true }),
    })
    .first();
  await referenceStep.locator("summary").click();
  await expect(referenceStep).toContainText(
    reference!.data.reference!.contentSha256!,
  );
  await page.screenshot({
    path: info.outputPath("02-annotation-receipts-desktop.png"),
    fullPage: true,
  });

  // Download the same owned API evidence, not a separate generated explanation.
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download activity JSON ↓", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(
    `celloras-activity-${submitted.id}.json`,
  );
  const receiptPath = info.outputPath("annotation-activity.json");
  await download.saveAs(receiptPath);
  const exported = JSON.parse(
    await readFile(receiptPath, "utf8"),
  ) as ActivityRunDetail;
  expect(exported.run.id).toBe(submitted.id);
  expect(exported.results).toEqual(complete.results);
  expect(exported.response).toEqual(complete.response);
  const recordedEvents = new Map(
    complete.events.map((event) => [event.id, event]),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Final answer", exact: true }),
  ).toBeVisible();
  complete = await activity(page, submitted.id);
  for (const [id, event] of recordedEvents)
    expect(complete.events.find((entry) => entry.id === id)).toEqual(event);

  // Check the linked result opens the actual persisted answer/card.
  await page
    .getByRole("region", { name: "Saved results", exact: true })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(`${origin}${canonicalHref}`);
  const actualCard = page
    .locator(`[data-analysis-id="${annotation!.id}"]`)
    .last();
  await actualCard.scrollIntoViewIfNeeded();
  await expect(actualCard).toBeVisible({ timeout: 30000 });

  await page.goto("/app/activity");
  await page
    .getByRole("combobox", { name: /^Experiment\b/ })
    .selectOption(projectId);
  await page
    .getByRole("combobox", { name: /^Status\b/ })
    .selectOption("completed");
  await page.getByLabel("Find a request", { exact: true }).fill(nonce);
  const requestList = page.getByRole("list", {
    name: "Agent requests",
    exact: true,
  });
  await expect(requestList.getByRole("link")).toHaveCount(1);
  await expect(requestList.getByRole("link")).toHaveAttribute(
    "href",
    `/app/activity/${submitted.id}`,
  );
  await page
    .getByRole("combobox", { name: /^Status\b/ })
    .selectOption("cancelled");
  await expect(
    page.getByRole("heading", { name: "No matching requests", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: /^Experiment\b/ })
    .selectOption(cancellationProject);
  await expect(requestList.getByRole("link")).toHaveCount(1);
  await expect(requestList.getByRole("link")).toHaveAttribute(
    "href",
    `/app/activity/${queued.id}`,
  );
  await page.screenshot({
    path: info.outputPath("03-filtered-cancelled-request.png"),
    fullPage: true,
  });

  // Record an explicit researcher decision through the real application and
  // verify that H-MEM's next recall is inspectable with its canonical source.
  const reviewResponse = await page.request.post(
    `${resultEndpoint}/annotation-review`,
    {
      headers,
      data: {
        submissionId: randomUUID(),
        cluster: "6",
        decision: "accepted",
        cellType: "Root hair",
        note: "Illustrative activity acceptance: keep Root hair provisional pending independent evidence. This is not a biological validation.",
      },
    },
  );
  expect(reviewResponse.ok(), await reviewResponse.text()).toBe(true);
  const reviewId = (await reviewResponse.json()).review.id as string;
  const recalled = await submit(page, projectId, {
    submissionId: randomUUID(),
    prompt: `For source cluster 6 in saved annotation run ${annotation!.id}, recall my latest saved Root hair review and cite its source. Do not perform new analysis.`,
  });
  const memoryDetail = await finished(page, recalled.id);
  expect(memoryDetail.run.status, memoryDetail.run.errorCode ?? "").toBe(
    "completed",
  );
  const memorySpan = completedSpan(memoryDetail, "memory");
  const source = `annotation-review:${reviewId}`;
  expect(memorySpan.data.sourceIds).toContain(source);
  expect(memorySpan.data.memoryCount).toBeGreaterThan(0);
  expect(memoryDetail.memory.map((item) => item.source)).toContain(source);
  const savedMemory = memoryDetail.memory.find(
    (item) => item.source === source,
  )!;
  expect(savedMemory.href).toBe(canonicalHref);
  expect(savedMemory.content).toContain("independent evidence");
  expect(
    (await (await page.request.get(resultEndpoint)).json()).result,
  ).toEqual(canonical.result);
  await page.goto(`/app/activity/${recalled.id}`);
  await expect(
    page.getByRole("heading", {
      name: "Reviews the agent recalled",
      exact: true,
    }),
  ).toBeVisible();
  const memoryRegion = page.getByRole("region", {
    name: "Reviews the agent recalled",
    exact: true,
  });
  await expect(memoryRegion).toContainText("Meterless H-MEM");
  await expect(
    memoryRegion.getByRole("link", { name: /View original review/ }),
  ).toHaveAttribute("href", canonicalHref);
  await page.screenshot({
    path: info.outputPath("04-hmem-source-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Reviews the agent recalled",
      exact: true,
    }),
  ).toBeVisible();
  await page.locator('[data-activity-kind="memory"] summary').click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("05-hmem-activity-mobile.png"),
    fullPage: true,
  });

  const stopping = await submit(page, cancellationProject, {
    submissionId: randomUUID(),
    prompt: `Running cancellation ${nonce}: explain in detail the possible experimental and computational considerations for a soybean single-cell study. Do not run tools.`,
  });
  await expect
    .poll(
      async () => {
        const detail = await activity(page, stopping.id);
        return (
          detail.run.status === "running" &&
          detail.events.some(
            (event) => event.kind === "model" && event.phase === "started",
          )
        );
      },
      { timeout: 60000, intervals: [500] },
    )
    .toBe(true);
  const stopped = await cancelled(page, cancellationProject, stopping.id);
  expect(
    stopped.events.some(
      (event) => event.kind === "context" && event.phase === "completed",
    ),
  ).toBe(true);
  await page.goto(`/app/activity/${stopping.id}`);
  await expect(
    page.getByText(
      "This request was cancelled. Steps completed before cancellation remain available below.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      '[data-activity-kind="model"][data-activity-status="cancelled"]',
    ),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("06-running-cancellation-mobile.png"),
    fullPage: true,
  });

  const outsider = await browser.newContext();
  try {
    const otherPage = await outsider.newPage();
    expect((await otherPage.request.get("/api/activity")).status()).toBe(401);
    expect(
      (await otherPage.request.get(`/api/activity/${submitted.id}`)).status(),
    ).toBe(401);
    await register(otherPage);
    expect(
      (await otherPage.request.get(`/api/activity/${submitted.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await otherPage.request.get(`/api/activity?projectId=${projectId}`)
      ).status(),
    ).toBe(404);
    const otherList = await otherPage.request.get("/api/activity");
    expect(otherList.ok()).toBe(true);
    const isolated = (await otherList.json()) as ActivityList;
    expect(isolated.runs).toEqual([]);
    expect(isolated.summary.total).toBe(0);
    await otherPage.goto(`/app/activity/${submitted.id}`);
    await expect(
      otherPage.locator('[role="alert"][data-error="true"]'),
    ).toContainText("This activity could not be found in your workspace.");
    await expect(otherPage.getByText(prompt, { exact: true })).toHaveCount(0);
  } finally {
    await outsider.close();
  }
  for (const query of [
    "status=unknown",
    "limit=31",
    "before=-1",
    "status=completed&status=failed",
  ])
    expect((await page.request.get(`/api/activity?${query}`)).status()).toBe(
      400,
    );
  expect(pageErrors).toEqual([]);
});
