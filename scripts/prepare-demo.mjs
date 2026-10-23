import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Local-only, authenticated preparation: never insert model replies or evidence.
const origin = new URL(
  process.env.CELLORAS_DEMO_URL || "http://localhost:3100",
);
if (!["localhost", "127.0.0.1"].includes(origin.hostname))
  throw new Error(
    "Demo preparation is restricted to the local development app.",
  );
const email = process.env.CELLORAS_DEMO_EMAIL;
const password = process.env.CELLORAS_DEMO_PASSWORD;
if (!email || !password)
  throw new Error(
    "Set CELLORAS_DEMO_EMAIL and CELLORAS_DEMO_PASSWORD for an existing local account.",
  );
const definition = JSON.parse(
  await readFile(
    new URL("../data/demo-experiments.json", import.meta.url),
    "utf8",
  ),
);
const output = resolve(".artifacts/demo-ready");
await mkdir(output, { recursive: true });
const log = (event, fields = {}) =>
  console.log(JSON.stringify({ event, ...fields }));
const submission = (projectId, key) => {
  const hex = createHash("sha256")
    .update(`${definition.version}:${projectId}:${key}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const browser = await chromium.launch({
  channel: process.env.CI ? "chromium" : "chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(20000);
let stage = "login";
try {
  await page.goto(new URL("/login", origin).href);
  await page.locator('input[name="username"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(new URL("/app", origin).href);
  log("demo.signed_in");
  stage = "prepare";

  const api = async (path, data) => {
    const url = new URL(path, origin).href;
    const response =
      data === undefined
        ? await page.request.get(url)
        : await page.request.post(url, {
            headers: { origin: origin.origin },
            data,
          });
    if (!response.ok())
      throw new Error(
        `API ${response.status()} at ${path}. Preparation stopped; existing submissions can be resumed.`,
      );
    return response.json();
  };
  const projects = await api("/api/projects");
  const report = {
    version: definition.version,
    preparedAt: new Date().toISOString(),
    examples: [],
  };
  for (const example of definition.examples) {
    stage = example.key;
    const found = projects.filter(
      (project) => project.name === example.projectName,
    );
    assert(
      found.length <= 1,
      `Multiple owned projects named ${example.projectName}; choose the intended project before preparing.`,
    );
    // Creation has no idempotency contract. Never automatically retry a lost response.
    const project =
      found[0] || (await api("/api/projects", { name: example.projectName }));
    if (!found.length) projects.push(project);
    log("demo.project", {
      example: example.key,
      projectId: project.id,
      reused: Boolean(found.length),
    });
    const endpoint = `/api/projects/${project.id}`;
    const save = (key, command) =>
      api(`${endpoint}/research`, {
        submissionId: submission(project.id, key),
        command,
      });
    const context = await save("context", {
      kind: "context",
      context: example.context,
    });
    const marker = await save("markers", {
      kind: "markers",
      speciesId: example.context.speciesId,
      label: example.markerLabel,
      markersRaw: example.genes.join(" "),
      contextEntryId: context.id,
    });
    await save("guide", { kind: "message", text: example.guide });
    log("demo.inputs_saved", { example: example.key, markerId: marker.id });
    let turn = await api(`${endpoint}/chat`, {
      submissionId: submission(project.id, "lookup"),
      prompt: example.prompt,
    });
    const cursor = (BigInt(turn.position) + 1n).toString();
    const readTurn = async () => {
      const workspace = await api(`${endpoint}/chat?before=${cursor}`);
      const saved = workspace.turns.find((item) => item.id === turn.id);
      assert(saved, "The owned demo turn could not be reopened.");
      return saved;
    };
    let lastStatus;
    const deadline = Date.now() + 300000;
    while (["queued", "running"].includes(turn.status)) {
      if (turn.status !== lastStatus) {
        log("demo.agent_progress", {
          example: example.key,
          turnId: turn.id,
          status: turn.status,
        });
        lastStatus = turn.status;
      }
      if (Date.now() > deadline)
        throw new Error(
          "Agent is still working. Rerun preparation to resume the same turn; no duplicate inference will be submitted.",
        );
      await new Promise((resolve) => setTimeout(resolve, 1500));
      turn = await readTurn();
    }
    assert.equal(
      turn.status,
      "completed",
      `Demo turn stopped: ${turn.errorCode || turn.status}. Inspect the saved turn; preparation never automatically retries inference.`,
    );
    const evidence = turn.responseDocument?.blocks.find(
      (block) => block.type === "marker_evidence",
    )?.result;
    assert(
      evidence,
      "The actual agent response did not include marker evidence.",
    );
    assert.equal(evidence.marker.id, marker.id);
    assert.equal(evidence.status, "matches_found");
    assert.deepEqual(evidence.matchedGenes, example.matchedGenes);
    assert.deepEqual(
      evidence.candidates.map((candidate) => candidate.cellType),
      example.expectedCandidates,
    );
    assert.equal(evidence.source.doi, "10.1016/j.xplc.2024.100984");
    if (example.key === "nodule") assert.equal(evidence.sharedGenes.length, 1);
    log("demo.evidence_verified", {
      example: example.key,
      turnId: turn.id,
      evidenceId: evidence.id,
      candidates: evidence.candidates.length,
    });
    if (example.review) {
      const review = await save("review", {
        kind: "evidence_review",
        evidenceRunId: evidence.id,
        markerEntryId: marker.id,
        ...example.review,
      });
      assert.deepEqual(review.evidence, evidence);
      log("demo.example_review_saved", {
        example: example.key,
        reviewId: review.id,
      });
    }
    const url = new URL(
      `/app/projects/${project.id}?chatBefore=${cursor}#turn-${turn.id}`,
      origin,
    ).href;
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(url);
    const card = page.locator(`[data-evidence-id="${evidence.id}"]`);
    await expect(card).toBeVisible();
    await card
      .getByLabel("Candidate cell types", { exact: true })
      .getByText(example.expectedCandidates[0], { exact: true })
      .click();
    await expect(
      card.getByRole("link", { name: "Source paragraph ↗" }).first(),
    ).toBeVisible();
    if (example.review) {
      await card.getByText("Saved review", { exact: true }).click();
      await expect(card).toContainText("Prepared demo review");
    }
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(output, `${example.key}-desktop.png`),
    });
    const composer = page.getByLabel("Message Celloras", { exact: true });
    await composer.fill(example.followUp);
    await card
      .getByRole("button", { name: "Discuss evidence", exact: true })
      .click();
    await expect(composer).toHaveValue(
      new RegExp(example.followUp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.equal((await readTurn()).status, "completed");
    // Do not send the suggested follow-up or leave a modified browser draft.
    await composer.fill("");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(card).toBeVisible();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Mobile page overflows.",
    );
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(output, `${example.key}-mobile.png`),
    });
    report.examples.push({
      key: example.key,
      projectId: project.id,
      markerId: marker.id,
      turnId: turn.id,
      evidenceId: evidence.id,
      url,
      followUp: example.followUp,
    });
    await writeFile(
      resolve(output, "prepared.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    log("demo.ready", { example: example.key, url });
  }
  await page.goto(new URL("/app", origin).href);
  log("demo.completed", { examples: report.examples.length });
} catch (error) {
  log("demo.failed", {
    stage,
    message:
      stage === "login"
        ? "Sign-in did not complete. Check the local account and Keycloak; no credentials were logged."
        : error.message,
  });
  process.exitCode = 1;
} finally {
  await browser.close();
}
