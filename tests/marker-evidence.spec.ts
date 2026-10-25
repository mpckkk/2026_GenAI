import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PlantContext } from "../app/core/plants";
import type { ResearchCommand, ResearchEntry } from "../app/core/research";
import type { ChatWorkspace } from "../app/core/chat";
import type { MarkerEvidenceRun } from "../app/core/evidence";

test.use({ actionTimeout: 20000 });
const execute = promisify(execFile);
const headers = { origin: "http://localhost:3100" };
const sample: PlantContext = {
  speciesId: "glycine-max",
  tissue: "Root",
  sampleLabel: "Soybean seedling",
  developmentalStage: "6-day-old roots",
  genomeVersion: "Glycine_max_v2.1.52",
  geneIdNamespace: "Glyma",
  notes: "Reference lookup acceptance. Researcher review required.",
};
async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`evidence-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
}
async function project(page: Page, name: string) {
  const response = await page.request.post("/api/projects", {
    headers,
    data: { name },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}
// Real legacy storage records exercise pagination without claiming extra model runs.
async function archiveTurns(projectId: string, count: number) {
  await execute("docker", [
    "compose",
    "exec",
    "-T",
    "agent-worker",
    "node",
    "--input-type=module",
    "-e",
    `
    import {Pool} from 'pg'; const pool=new Pool({connectionString:process.env.DATABASE_URL});
    try {await pool.query("INSERT INTO agent_turns(project_id,owner_id,submission_id,prompt,response_text,status) SELECT p.id,p.owner_id,gen_random_uuid(),'Archived discussion '||g,'Archived conversation note.','completed' FROM projects p CROSS JOIN generate_series(1,$2::int) g WHERE p.id=$1",[process.argv[1],Number(process.argv[2])]);} finally {await pool.end();}
  `,
    projectId,
    String(count),
  ]);
}

async function save(page: Page, id: string, command: ResearchCommand) {
  const response = await page.request.post(`/api/projects/${id}/research`, {
    headers,
    data: { submissionId: randomUUID(), command },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}
async function markers(
  page: Page,
  id: string,
  context: PlantContext | null,
  genes: string,
  label: string,
) {
  const entry = context
    ? await save(page, id, { kind: "context", context })
    : null;
  return save(page, id, {
    kind: "markers",
    speciesId: "glycine-max",
    label,
    markersRaw: genes,
    contextEntryId: entry?.id || null,
  });
}
async function lookup(
  page: Page,
  id: string,
  label: string,
): Promise<{ run: MarkerEvidenceRun; turnId: string }> {
  await page.goto(`/app/projects/${id}`);
  await expect(page.getByText("Agent connected", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByLabel("Message Celloras", { exact: true })
    .fill(
      `Look up published marker evidence for my saved marker set “${label}”. Show the actual evidence card and explain candidate cell types or unresolved context. Do not assume missing metadata.`,
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const turn = page.locator("[data-chat-turn-id]").last();
  await expect(turn.locator('[data-chat-role="user"]')).toContainText(
    `saved marker set “${label}”`,
  );
  await expect(turn).toHaveAttribute("data-chat-status", /completed|failed/, {
    timeout: 240000,
  });
  await expect(turn).toHaveAttribute("data-chat-status", "completed");
  await expect(
    turn.getByRole("region", { name: "Marker evidence card" }),
  ).toBeVisible();
  const workspace: ChatWorkspace = await (
    await page.request.get(`/api/projects/${id}/chat`)
  ).json();
  const saved = workspace.turns.at(-1)!;
  const block = saved.responseDocument?.blocks.find(
    (block) => block.type === "marker_evidence",
  );
  expect(block?.type).toBe("marker_evidence");
  if (block?.type !== "marker_evidence")
    throw new Error("Real agent did not return evidence");
  return { run: block.result, turnId: saved.id };
}

test("real agent retrieves published root evidence and researcher saves an immutable owned review", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(360000);
  await register(page);
  const id = await project(page, "Soybean evidence review");
  await archiveTurns(id, 49);
  const marker = await markers(
    page,
    id,
    sample,
    "Glyma.14G218700 Glyma.16G106800 Glyma.01G000100",
    "Root cluster 3",
  );
  const { run, turnId } = await lookup(page, id, "Root cluster 3");
  expect(run.status).toBe("matches_found");
  expect(run.marker).toEqual(marker);
  expect(run.candidates.map((c) => c.cellType)).toEqual(["Endodermis"]);
  expect(run.matchedGenes).toEqual(["Glyma.14G218700", "Glyma.16G106800"]);
  expect(run.unmatchedGenes).toEqual(["Glyma.01G000100"]);
  expect(run.source.doi).toBe("10.1016/j.xplc.2024.100984");
  expect(run.source.referenceSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(
    run.candidates[0].records.every((r) => r.sourceUrl.endsWith("#p0230")),
  ).toBe(true);
  const card = page.getByRole("region", { name: "Marker evidence card" });
  await expect(
    card.getByRole("heading", { name: "Endodermis", exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("link", { name: "Source paragraph ↗" }),
  ).toHaveCount(2);
  await card.getByText("Reference, method and limits", { exact: true }).click();
  await expect(card).toContainText("Glycine_max_v2.1.52");
  await expect(card).toContainText("Marker overlap, not a confidence score.");
  await card.getByText("Reference, method and limits", { exact: true }).click();
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("evidence-root-desktop.png"),
  });
  await card
    .getByText("Review and save your decision", { exact: true })
    .click();
  await card
    .getByRole("combobox", { name: "Your decision", exact: true })
    .selectOption("candidate:Endodermis");
  await card
    .getByRole("textbox", { name: "Review notes (optional)", exact: true })
    .fill("Provisional endodermis. Confirm against expression and sample QC.");
  await card.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(card).toContainText("Saved by you");
  const research = await (
    await page.request.get(`/api/projects/${id}/research`)
  ).json();
  const review = research.page.entries.find(
    (e: ResearchEntry) => e.kind === "evidence_review",
  );
  expect(review.cellType).toBe("Endodermis");
  expect(review.evidence).toEqual(run);
  await save(page, id, {
    kind: "context",
    context: { ...sample, tissue: "Leaf", sampleLabel: "Later sample" },
  });
  await archiveTurns(id, 51);
  await page.goto(
    `/app/projects/${id}?chatBefore=${BigInt(run.turnPosition) + BigInt(1)}#turn-${turnId}`,
  );
  await card.getByText("Saved review", { exact: true }).click();
  await expect(card).toContainText("Provisional endodermis");
  expect(
    (
      await (
        await page.request.get(
          `/api/projects/${id}/chat?before=${BigInt(run.turnPosition) + BigInt(1)}`,
        )
      ).json()
    ).turns
      .find((turn: { id: string }) => turn.id === turnId)
      .responseDocument.blocks.find(
        (b: { type: string }) => b.type === "marker_evidence",
      ).result,
  ).toEqual(run);
  await card.getByRole("link", { name: "View saved research record" }).click();
  const history = page.getByRole("dialog", { name: "Research workspace" });
  await expect(history).toBeVisible();
  await expect(history).toContainText("Your evidence review");
  await history
    .getByRole("link", { name: "Open evidence in conversation" })
    .click();
  await expect(page.locator(`[data-chat-turn-id="${turnId}"]`)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator(`[data-chat-turn-id="${turnId}"]`)).toBeInViewport({
    ratio: 0.01,
  });
  await expect(card).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("evidence-root-mobile.png"),
  });

  // Explicit saved decision replay and conflict through the actual owned research API.
  const submissionId = randomUUID();
  const command = {
    kind: "evidence_review",
    evidenceRunId: run.id,
    markerEntryId: marker.id,
    decision: "unresolved",
    cellType: null,
    notes: "Need expression data.",
  };
  const endpoint = `/api/projects/${id}/research`;
  const send = (data: unknown) =>
    page.request.post(endpoint, { headers, data });
  const first = await send({ submissionId, command });
  expect(first.ok()).toBe(true);
  const replay = await send({ submissionId, command });
  expect((await replay.json()).id).toBe((await first.json()).id);
  expect(
    (
      await send({ submissionId, command: { ...command, notes: "Changed" } })
    ).status(),
  ).toBe(409);
  expect(
    (
      await send({
        submissionId: randomUUID(),
        command: {
          ...command,
          decision: "candidate",
          cellType: "Invented cell",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await send({
        submissionId: randomUUID(),
        command: { ...command, evidence: run },
      })
    ).status(),
  ).toBe(400);
  const otherProject = await project(page, "Other owned project");
  const otherMarker = await markers(
    page,
    otherProject,
    sample,
    "Glyma.16G106800",
    "Other markers",
  );
  expect(
    (
      await page.request.post(`/api/projects/${otherProject}/research`, {
        headers,
        data: {
          submissionId: randomUUID(),
          command: { ...command, markerEntryId: otherMarker.id },
        },
      })
    ).status(),
  ).toBe(400);
  const foreign = await browser.newContext();
  const outsider = await foreign.newPage();
  await register(outsider);
  expect(
    (await outsider.request.get(`/api/projects/${id}/chat`)).status(),
  ).toBe(404);
  expect(
    (
      await outsider.request.post(endpoint, {
        headers,
        data: { submissionId: randomUUID(), command },
      })
    ).status(),
  ).toBe(404);
  await foreign.close();

  // Production worker resolver independently rejects forged catalogs against real PostgreSQL.
  const check = await execute("docker", [
    "compose",
    "exec",
    "-T",
    "agent-worker",
    "node",
    "--input-type=module",
    "-e",
    `
    import assert from 'node:assert/strict'; import {Pool} from 'pg';
    import {resolveAgentResponse} from './app/services/agent-response.mjs';
    import {runMarkerEvidence} from './app/services/marker-evidence.mjs';
    import {PublishedMarkerReference} from './app/adapters/marker-reference.mjs';
    const ids=JSON.parse(process.argv[1]); const pool=new Pool({connectionString:process.env.DATABASE_URL});
    let checkTurn;
    try {
      const ownerId=(await pool.query('SELECT owner_id FROM projects WHERE id=$1',[ids.projectId])).rows[0].owner_id;
      const response={version:1,blocks:[{type:'markdown',text:'Evidence'},{type:'marker_evidence',entryId:ids.runId}]};
      await assert.rejects(resolveAgentResponse(pool,{response,projectId:ids.otherProject,ownerId,availableCards:[{type:'marker_evidence',entryId:ids.runId}]}),{code:'agent_card_unavailable'});
      checkTurn=(await pool.query("INSERT INTO agent_turns(project_id,owner_id,submission_id,prompt,status,heartbeat_at) VALUES ($1,$2,gen_random_uuid(),'Evidence ownership boundary check','running',now()) RETURNING id",[ids.projectId,ownerId])).rows[0].id;
      const base={projectId:ids.projectId,ownerId,turnId:checkTurn};
      await assert.rejects(runMarkerEvidence(pool,new PublishedMarkerReference(),{...base,markerEntryId:ids.otherMarker,availableCards:[{type:'marker_set',entryId:ids.otherMarker}]}),{code:'agent_card_unavailable'});
      const checked=await runMarkerEvidence(pool,new PublishedMarkerReference(),{...base,markerEntryId:ids.markerId,availableCards:[{type:'marker_set',entryId:ids.markerId}]});
      assert.equal(checked.status,'matches_found');
      assert.equal(checked.marker.id,ids.markerId);
      const audit=(await pool.query('SELECT count(*)::int AS count FROM marker_evidence_runs WHERE turn_id=$1',[ids.turnId])).rows[0];
      assert.equal(audit.count,1);
      console.log('Owned result resolution, forged catalog denial and one real persisted lookup passed.');
    } finally {if(checkTurn) await pool.query("UPDATE agent_turns SET status='failed',error_code='boundary_check_only',finished_at=now() WHERE id=$1",[checkTurn]); await pool.end();}
  `,
    JSON.stringify({
      projectId: id,
      markerId: marker.id,
      otherProject,
      otherMarker: otherMarker.id,
      runId: run.id,
      turnId,
    }),
  ]);
  console.log(check.stdout.trim());
});

test("shared nodule markers remain ambiguous and malformed source IDs stay unsupported", async ({
  page,
}, testInfo) => {
  test.setTimeout(300000);
  await register(page);
  const id = await project(page, "Ambiguous soybean nodule");
  await markers(
    page,
    id,
    {
      ...sample,
      tissue: "Nodule",
      developmentalStage: "28 days after inoculation",
    },
    "Glyma.13G334500 Glyma.15G2100100 G4DT",
    "Nodule cluster 2",
  );
  const { run } = await lookup(page, id, "Nodule cluster 2");
  expect(run.candidates.map((c) => c.cellType)).toEqual([
    "Sclereid layer",
    "Vascular bundle",
  ]);
  expect(run.sharedGenes).toEqual([
    {
      geneId: "Glyma.13G334500",
      cellTypes: ["Sclereid layer", "Vascular bundle"],
    },
  ]);
  expect(run.unsupportedGenes).toEqual(["Glyma.15G2100100", "G4DT"]);
  expect(
    run.candidates.every((c) =>
      c.records.every((r) => r.sourceUrl.endsWith("#p0235")),
    ),
  ).toBe(true);
  const card = page.getByRole("region", { name: "Marker evidence card" });
  await expect(card).toContainText("Matches span multiple cell types");
  await card.getByText("Shared markers (1)", { exact: true }).click();
  await card
    .getByText("Identifiers not converted (2)", { exact: true })
    .click();
  await card
    .getByText("Review and save your decision", { exact: true })
    .click();
  await card
    .getByRole("combobox", { name: "Your decision", exact: true })
    .selectOption("unresolved");
  await card.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(card).toContainText("Unresolved · Saved by you");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("evidence-ambiguous-desktop.png"),
  });
});

for (const scenario of [
  {
    name: "missing context",
    context: null,
    genes: "Glyma.16G106800",
    status: "context_required",
  },
  {
    name: "different genome build",
    context: { ...sample, genomeVersion: "Wm82.a4.v1" },
    genes: "Glyma.16G106800",
    status: "incompatible",
  },
  {
    name: "unsupported tissue",
    context: { ...sample, tissue: "Leaf" },
    genes: "Glyma.16G106800",
    status: "incompatible",
  },
  {
    name: "no reference matches",
    context: sample,
    genes: "Glyma.01G000100",
    status: "no_matches",
  },
]) {
  test(`real lookup explicitly reports ${scenario.name}`, async ({ page }) => {
    test.setTimeout(300000);
    await register(page);
    const id = await project(page, `Evidence: ${scenario.name}`);
    await markers(page, id, scenario.context, scenario.genes, "Target cluster");
    const { run } = await lookup(page, id, "Target cluster");
    expect(run.status).toBe(scenario.status);
    expect(run.candidates).toHaveLength(0);
    expect(run.matchedGenes).toHaveLength(0);
    const card = page.getByRole("region", { name: "Marker evidence card" });
    await card
      .getByText("Review and save your decision", { exact: true })
      .click();
    await expect(card.getByRole("option", { name: /^Candidate:/ })).toHaveCount(
      0,
    );
    await card
      .getByRole("combobox", { name: "Your decision", exact: true })
      .selectOption("unresolved");
    await card
      .getByRole("button", { name: "Save review", exact: true })
      .click();
    await expect(card).toContainText("Unresolved · Saved by you");
  });
}
