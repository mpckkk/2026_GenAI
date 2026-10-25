import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Executes real authenticated application actions. No inserted replies or fixtures.
const origin = new URL(
  process.env.CELLORAS_DEMO_URL || "http://localhost:3100",
);
assert(
  [
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    "https://celloras.com",
  ].includes(origin.origin),
  "Use the local app or the authorized Celloras deployment.",
);
const production = origin.origin === "https://celloras.com";
const register = process.env.CELLORAS_WORKFLOW_AUTH === "register";
const version = "annotation-workflow-v1";
const root = resolve(".artifacts/workflow-demo", origin.hostname);
await mkdir(root, { recursive: true });
const log = async (event, fields = {}) => {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    event,
    ...fields,
  });
  console.log(line);
  await appendFile(resolve(root, "progress.jsonl"), `${line}\n`);
};
const submission = (projectId, key) => {
  const hex = createHash("sha256")
    .update(`${version}:${projectId}:${key}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const browser = await chromium.launch({
  channel: process.env.CI ? "chromium" : "chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30000);
let stage = "authentication";
let output;

try {
  if (register) {
    await page.goto(new URL("/register", origin).href);
    const password = randomBytes(24).toString("base64url");
    await page
      .locator('input[name="email"]')
      .fill(`workflow-${randomBytes(8).toString("hex")}@example.test`);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="password-confirm"]').fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
  } else {
    await page.goto(new URL("/login", origin).href);
    if (
      !production &&
      process.env.CELLORAS_DEMO_EMAIL &&
      process.env.CELLORAS_DEMO_PASSWORD
    ) {
      await page
        .locator('input[name="username"]')
        .fill(process.env.CELLORAS_DEMO_EMAIL);
      await page
        .locator('input[name="password"]')
        .fill(process.env.CELLORAS_DEMO_PASSWORD);
    } else {
      await page
        .getByRole("button", { name: "Use demo credentials", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Log in", exact: true }).click();
  }
  await expect(page).toHaveURL(new URL("/app", origin).href);
  stage = "open experiment";
  const api = async (path, data) => {
    const response =
      data === undefined
        ? await page.request.get(new URL(path, origin).href)
        : await page.request.post(new URL(path, origin).href, {
            headers: { origin: origin.origin },
            data,
          });
    assert(
      response.ok(),
      `HTTP ${response.status()} at ${path}; stopped without retrying the action.`,
    );
    return response.json();
  };
  const opened = await api("/api/demo", {});
  const projectId = opened.projectId;
  output = resolve(root, projectId);
  await mkdir(output, { recursive: true });
  const endpoint = `/api/projects/${projectId}`;
  await log("workflow.opened", { projectId, registered: register });

  async function turn(key, prompt, action) {
    stage = key;
    let current = await api(`${endpoint}/chat`, {
      submissionId: submission(projectId, key),
      prompt,
      ...(action ? { action } : {}),
    });
    const position = (BigInt(current.position) + 1n).toString();
    const deadline = Date.now() + 300000;
    let previous;
    while (["queued", "running"].includes(current.status)) {
      if (current.status !== previous) {
        await log("workflow.agent", {
          stage,
          turnId: current.id,
          status: current.status,
        });
        previous = current.status;
      }
      assert(
        Date.now() < deadline,
        "Agent is still working. Resume this preparation to reopen the same submission.",
      );
      await new Promise((done) => setTimeout(done, 1500));
      const workspace = await api(`${endpoint}/chat?before=${position}`);
      const found = workspace.turns.find((item) => item.id === current.id);
      assert(found, "The owned turn could not be reopened.");
      current = found;
    }
    assert.equal(
      current.status,
      "completed",
      `Agent stopped: ${current.errorCode || current.status}. No automatic inference retry.`,
    );
    await log("workflow.completed_turn", { stage, turnId: current.id });
    return current;
  }
  const turnUrl = (value) =>
    new URL(
      `${opened.url}?chatBefore=${BigInt(value.position) + 1n}#turn-${value.id}`,
      origin,
    ).href;
  const annotation = await turn(
    "annotate",
    "Annotate all clusters in this soybean-root dataset. Show candidate cell types, measured marker evidence and uncertainty in an annotation card. Keep the final decisions for my review.",
    {
      operation: "annotation",
      datasetId: "gse270392-root-rna-v1",
    },
  );
  const block = annotation.responseDocument?.blocks.find(
    (item) => item.type === "annotation_result",
  );
  assert(block, "The real agent did not return an annotation card.");
  const runId = block.result.id;
  const runEndpoint = `${endpoint}/analyses/${runId}`;
  const readRun = () => api(runEndpoint);
  const run = await readRun();
  assert.equal(run.result.operation, "annotation");
  assert.equal(run.result.payload.clusters.length, 12);
  assert.equal(
    run.result.payload.clusters.reduce((sum, c) => sum + c.nCells, 0),
    7496,
  );
  assert.equal(
    run.result.payload.validation.status,
    "not_independently_validated",
  );
  assert(
    run.result.summary.ambiguousCount > 0 &&
      run.result.summary.unresolvedCount > 0,
  );
  const delivery = run.result.payload.referenceDelivery;
  if (production || process.env.CELLORAS_TEST_REQUIRE_ZETARIS === "1") {
    assert.equal(
      delivery?.provider,
      "Zetaris",
      "This acceptance requires an actual Zetaris reference query.",
    );
    assert.equal(delivery.recordCount, 42);
    assert.match(delivery.requestId, /^[a-f0-9-]{36}$/i);
  }
  const group = run.result.payload.clusters.find(
    (item) => item.cluster === "6",
  );
  const candidate = group?.candidates.find(
    (item) => item.cellType === "Root hair",
  );
  assert.equal(group?.nCells, 388);
  assert(candidate?.supportingGenes.length >= 2);
  const genes = candidate.supportingGenes.map((item) => item.geneId);
  const acceptedNote = `Demonstration review: keep Root hair provisional for group 6. Measured support includes ${genes.join(" and ")}; confirm with independent evidence before treating this as a validated identity.`;
  const correctedNote =
    "Demonstration correction: withdraw the provisional Root hair label for group 6 and keep it unresolved until independent evidence is reviewed. The measured marker evidence has not changed.";
  assert(
    run.annotationReviews
      .filter((item) => item.cluster === "6")
      .every((item) => [acceptedNote, correctedNote].includes(item.note)),
    "A later researcher decision exists. Preserve it; do not prepare over their work.",
  );
  await log("workflow.annotation_verified", {
    projectId,
    runId,
    nuclei: 7496,
    groups: 12,
    referenceProvider: delivery?.provider || "published",
    queryId: delivery?.requestId || null,
  });

  const card = () => page.locator(`[data-analysis-id="${runId}"]`).last();
  async function showAnnotation() {
    await page.goto(turnUrl(annotation));
    await card().scrollIntoViewIfNeeded();
    await expect(
      card().getByRole("heading", {
        name: "Review the cell-type evidence",
        exact: true,
      }),
    ).toBeVisible();
    await card()
      .getByRole("button", { name: /^Cluster 6\b/ })
      .click();
  }
  await showAnnotation();
  stage = "inspect evidence";
  await card()
    .locator("summary")
    .filter({ hasText: "Root hair" })
    .first()
    .click();
  const supporting = card()
    .locator("details")
    .filter({
      has: page.locator("summary").filter({ hasText: /^Supporting genes \(/ }),
    })
    .last();
  await supporting.locator("summary").first().click();
  const gene = candidate.supportingGenes[0];
  const row = card()
    .getByRole("row")
    .filter({
      has: page.getByRole("button", { name: `${gene.geneId} ↗`, exact: true }),
    });
  await row
    .locator("summary")
    .filter({ hasText: "Exact values & source" })
    .click();
  await expect(
    row.getByRole("link", { name: "Open marker source ↗", exact: true }),
  ).toHaveAttribute("href", gene.sourceUrl);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, "01-marker-evidence.png") });
  const methods = card()
    .locator("details")
    .filter({
      has: page
        .locator("summary")
        .filter({ hasText: "Reference, method and validation" }),
    })
    .last();
  await methods.locator("summary").first().click();
  if (delivery)
    await expect(methods).toContainText(
      "Marker reference retrieved through Zetaris",
    );
  await methods.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: resolve(output, "02-reference-provenance.png"),
  });

  const comparison = await turn(
    "compare",
    `Compare ${genes.join(", ")} across the soybean-root groups in a dot plot. Explain how the measured expression supports or limits the Root hair candidate for group 6. This is saved annotation run ${runId}.`,
    {
      operation: "dotplot",
      datasetId: run.result.dataset.id,
      genes,
    },
  );
  const plotBlock = comparison.responseDocument?.blocks.find(
    (item) =>
      item.type === "scientific_result" &&
      item.result.result.operation === "dotplot",
  );
  assert(plotBlock, "The real agent did not return the marker dot plot.");
  await page.goto(turnUrl(comparison));
  const plot = page
    .locator(`[data-analysis-id="${plotBlock.result.id}"]`)
    .last();
  await expect(plot).toBeVisible();
  await expect(
    plot.getByRole("img", { name: /^Gene expression across source clusters/ }),
  ).toBeVisible();
  await plot.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, "03-marker-comparison.png") });

  async function saveReview(note, decision) {
    const current = await readRun();
    const existing = current.annotationReviews.find(
      (item) => item.cluster === "6" && item.note === note,
    );
    if (existing) return existing;
    assert(
      current.annotationReviews
        .filter((item) => item.cluster === "6")
        .every((item) => item.note === acceptedNote),
      "A later decision exists; preparation will not overwrite it.",
    );
    await showAnnotation();
    await card()
      .locator("summary")
      .filter({
        hasText: /^(Review and save a decision|Add another decision)$/,
      })
      .click();
    const form = card().getByRole("form", {
      name: "Review annotation for cluster 6",
      exact: true,
    });
    await form
      .getByLabel("What do you conclude?", { exact: true })
      .selectOption(decision);
    if (decision === "accepted")
      await form
        .getByLabel("Candidate cell type", { exact: true })
        .selectOption("Root hair");
    await form.getByLabel("Evidence and reasoning", { exact: true }).fill(note);
    const saved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          `${runEndpoint}/annotation-review` &&
        response.request().method() === "POST",
    );
    await form
      .getByRole("button", { name: "Save annotation decision", exact: true })
      .click();
    const response = await saved;
    assert(response.ok(), `Review save returned HTTP ${response.status()}.`);
    const review = (await response.json()).review;
    assert.equal(review.note, note);
    assert.equal(review.cluster, "6");
    assert.equal(review.decision, decision);
    await log("workflow.review_saved", {
      projectId,
      runId,
      reviewId: review.id,
      decision,
    });
    return review;
  }
  stage = "save provisional review";
  const original = await saveReview(acceptedNote, "accepted");
  await showAnnotation();
  const composer = page.getByLabel("Message Celloras", { exact: true });
  await composer.fill("Keep my unfinished question.");
  const beforeDraft = await api(`${endpoint}/chat`);
  await card()
    .getByRole("button", {
      name: "Ask about my saved decision",
      exact: true,
    })
    .click();
  await expect(composer).toHaveValue(/Keep my unfinished question\./);
  await expect(composer).toHaveValue(new RegExp(runId));
  await expect(composer).toHaveValue(/latest saved decision for group 6/);
  assert.equal(
    (await api(`${endpoint}/chat`)).turns.length,
    beforeDraft.turns.length,
    "Drafting a decision question unexpectedly sent it.",
  );
  await composer.fill("");
  const first = await turn(
    "recall",
    `For group 6 in saved annotation run ${runId}, what did I decide and why? Recall my saved researcher decision and cite its source. Do not run a new analysis or treat my review as independent validation.`,
  );
  assert(
    first.recalledDecisions?.some(
      (item) => item.source === `annotation-review:${original.id}`,
    ),
    "H-MEM did not recall the actual annotation review.",
  );
  assert.match(first.response, /root hair/i);
  async function showReceipt(value, expectedReview, filename) {
    await page.goto(turnUrl(value));
    const receipt = page
      .locator(`[data-chat-turn-id="${value.id}"] details`)
      .filter({ hasText: /Recalled \d+ saved decision/ })
      .first();
    await receipt.locator("summary").click();
    await expect(receipt).toContainText("H-MEM");
    await expect(receipt).toContainText(expectedReview.note);
    await receipt.scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(output, filename) });
    return receipt;
  }
  const receipt = await showReceipt(
    first,
    original,
    "04-recalled-decision.png",
  );
  const source = first.recalledDecisions.find(
    (item) => item.source === `annotation-review:${original.id}`,
  );
  await expect(
    receipt.locator("a").filter({ hasText: "group 6" }).first(),
  ).toHaveAttribute("href", source.href);
  await receipt.locator("a").filter({ hasText: "group 6" }).first().click();
  // The source turn may contain a long explanation above its lazy-loaded card.
  await card().scrollIntoViewIfNeeded();
  await expect(card()).toBeVisible();
  await card()
    .getByRole("button", { name: /^Cluster 6\b/ })
    .click();
  await expect(card()).toContainText(original.note);

  stage = "save correction";
  const correction = await saveReview(correctedNote, "unresolved");
  const second = await turn(
    "recall-correction",
    `For group 6 in saved annotation run ${runId}, what is my latest decision and why did it change? Use my current saved researcher review, cite it and distinguish it from the unchanged computed suggestion. Do not run new analysis.`,
  );
  assert(
    second.recalledDecisions?.some(
      (item) => item.source === `annotation-review:${correction.id}`,
    ),
  );
  assert(
    !second.recalledDecisions.some(
      (item) => item.source === `annotation-review:${original.id}`,
    ),
    "The superseded review was returned as current memory.",
  );
  assert.match(second.response, /unresolved|withdra/i);
  await showReceipt(second, correction, "05-corrected-decision.png");
  stage = "verify persistence";
  await page.reload();
  const stored = await readRun();
  assert.deepEqual(
    stored.result,
    run.result,
    "A researcher correction changed numerical evidence.",
  );
  const workspace = await api(
    `${endpoint}/chat?before=${BigInt(second.position) + 1n}`,
  );
  assert.deepEqual(
    workspace.turns.find((item) => item.id === first.id)?.recalledDecisions,
    first.recalledDecisions,
    "The historical answer's source receipt changed.",
  );
  assert.deepEqual(
    workspace.turns.find((item) => item.id === second.id)?.recalledDecisions,
    second.recalledDecisions,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await showReceipt(second, correction, "06-mobile-recall.png");
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Mobile page overflows horizontally.",
  );
  const report = {
    version,
    checkedAt: new Date().toISOString(),
    origin: origin.origin,
    projectId,
    url: new URL(opened.url, origin).href,
    startUrl: turnUrl(annotation),
    annotation: {
      turnId: annotation.id,
      runId,
      reference: delivery || { provider: "published" },
      summary: run.result.summary,
    },
    comparison: { turnId: comparison.id, runId: plotBlock.result.id },
    reviews: [original.id, correction.id],
    recallTurns: [first.id, second.id],
    recallSources: [source.source, `annotation-review:${correction.id}`],
    resultUnchanged: true,
    historicalReceiptUnchanged: true,
    limitations: [
      "Prepared reviews are explicitly illustrative researcher decisions.",
      "Annotation is exploratory and has not been independently validated.",
    ],
  };
  await writeFile(
    resolve(output, "receipt.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await log("workflow.accepted", {
    projectId,
    runId,
    url: report.url,
    receipt: resolve(output, "receipt.json"),
  });
} catch (error) {
  await log("workflow.failed", {
    stage,
    error:
      stage === "authentication"
        ? "Authentication failed; credentials are not logged."
        : error.message,
  });
  if (output)
    await page
      .screenshot({ path: resolve(output, "failure.png") })
      .catch(() => undefined);
  process.exitCode = 1;
} finally {
  await browser.close();
}
