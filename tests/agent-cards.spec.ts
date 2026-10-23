import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ResearchCommand } from "../app/core/research";
import type { ChatWorkspace } from "../app/core/chat";

const execute = promisify(execFile);
const headers = { origin: "http://localhost:3100" };
async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`cards-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
}
async function project(page: Page, name: string) {
  const result = await page.request.post("/api/projects", {
    headers,
    data: { name },
  });
  expect(result.status()).toBe(201);
  return (await result.json()).id as string;
}
async function save(page: Page, projectId: string, command: ResearchCommand) {
  const result = await page.request.post(
    `/api/projects/${projectId}/research`,
    {
      headers,
      data: { submissionId: randomUUID(), command },
    },
  );
  expect(result.ok()).toBe(true);
  return result.json();
}
const context = {
  speciesId: "glycine-max",
  tissue: "Root",
  sampleLabel: "Soybean root A",
  developmentalStage: "Seedling",
  genomeVersion: null,
  geneIdNamespace: null,
  notes: "Researcher-supplied context; analysis has not been run.",
};

test("agent selects real saved cards, persists snapshots and follows up across desktop and mobile", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(300000);
  await register(page);
  const projectId = await project(page, "Soybean visual conversation");
  const sample = await save(page, projectId, { kind: "context", context });
  const marker = await save(page, projectId, {
    kind: "markers",
    speciesId: context.speciesId,
    label: "Root cluster 4",
    markersRaw:
      "Glyma.01G000100, Glyma.02G000200, Glyma.03G000300, Glyma.04G000400, Glyma.05G000500, Glyma.06G000600",
    contextEntryId: sample.id,
  });
  const endpoint = `/api/projects/${projectId}/chat`;
  await page.goto(`/app/projects/${projectId}`);
  await page
    .getByLabel("Message Celloras", { exact: true })
    .fill(
      "Show my saved sample context and Root cluster 4 markers as visual cards, with a short introduction. Do not infer a cell type.",
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const first = page.locator("[data-chat-turn-id]").first();
  await expect(first).toHaveAttribute("data-chat-status", /completed|failed/, {
    timeout: 180000,
  });
  await expect(first).toHaveAttribute("data-chat-status", "completed");
  const sampleCard = first.getByRole("region", { name: "Sample context card" });
  const markerCard = first.getByRole("region", { name: "Marker set card" });
  await expect(sampleCard).toHaveAttribute("data-record-id", sample.id);
  await expect(markerCard).toHaveAttribute("data-record-id", marker.id);
  await expect(sampleCard).toContainText("Soybean root A");
  await sampleCard.getByText("All sample details", { exact: true }).click();
  await expect(sampleCard).toContainText("Gene ID namespace");
  await sampleCard.getByText("All sample details", { exact: true }).click();
  await expect(
    markerCard
      .getByRole("list", { name: "Parsed markers" })
      .getByRole("listitem"),
  ).toHaveCount(6);
  await markerCard.getByText("Original marker text", { exact: true }).click();
  await expect(markerCard.locator("pre")).toHaveText(marker.markersRaw);
  await markerCard.getByText("Original marker text", { exact: true }).click();
  await sampleCard.getByText("Saved record details", { exact: true }).click();
  await expect(sampleCard.locator("code")).toHaveText(sample.id);
  await sampleCard.getByText("Saved record details", { exact: true }).click();
  const saved: ChatWorkspace = await (await page.request.get(endpoint)).json();
  const savedDocument = saved.turns[0].responseDocument;
  expect(
    savedDocument?.blocks.filter((block) => block.type !== "markdown"),
  ).toHaveLength(2);
  expect(
    savedDocument?.blocks.find((block) => block.type === "marker_set")?.entry,
  ).toEqual(marker);

  await save(page, projectId, {
    kind: "context",
    context: { ...context, tissue: "Leaf", sampleLabel: "Soybean leaf B" },
  });
  await page.reload();
  await expect(page.getByLabel("Latest sample context")).toContainText("Leaf");
  await expect(sampleCard).toContainText("Root");
  await expect(sampleCard).not.toContainText("Soybean leaf B");
  expect(
    (await (await page.request.get(endpoint)).json()).turns[0].responseDocument,
  ).toEqual(savedDocument);
  await markerCard
    .getByText("Sample context saved with these markers", { exact: true })
    .click();
  await expect(markerCard).toContainText("Soybean root A");
  await markerCard
    .getByText("Sample context saved with these markers", { exact: true })
    .click();

  const input = page.getByLabel("Message Celloras", { exact: true });
  await input.fill("Keep my draft.");
  await markerCard
    .getByRole("button", { name: "Ask about this", exact: true })
    .click();
  await expect(input).toHaveValue(/Keep my draft\.[\s\S]*Root cluster 4/);
  await expect(input).toBeFocused();
  await expect(page.locator("[data-chat-turn-id]")).toHaveCount(1);
  await input.fill("");
  await markerCard
    .getByRole("button", { name: "Ask about this", exact: true })
    .click();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const second = page.locator("[data-chat-turn-id]").nth(1);
  await expect(second).toHaveAttribute("data-chat-status", /completed|failed/, {
    timeout: 180000,
  });
  await expect(second).toHaveAttribute("data-chat-status", "completed");
  await expect(second.locator('[data-chat-role="assistant"]')).toContainText(
    /root/i,
  );

  // Direct boundary checks still use the real resolver and PostgreSQL records.
  // Deliberately spoof the offered catalog: database ownership must independently deny access.
  const sameOwnerProject = await project(page, "Other owned experiment");
  const otherMarker = await save(page, sameOwnerProject, {
    kind: "markers",
    speciesId: context.speciesId,
    label: "Other project",
    markersRaw: "OTHER_GENE",
    contextEntryId: null,
  });
  const foreign = await browser.newContext();
  const foreignPage = await foreign.newPage();
  await register(foreignPage);
  const foreignProject = await project(foreignPage, "Foreign experiment");
  const foreignMarker = await save(foreignPage, foreignProject, {
    kind: "markers",
    speciesId: context.speciesId,
    label: "Private",
    markersRaw: "PRIVATE_GENE",
    contextEntryId: null,
  });
  expect((await foreignPage.request.get(endpoint)).status()).toBe(404);
  await foreign.close();
  const boundaryScript = `
    import assert from 'node:assert/strict';
    import { Pool } from 'pg';
    import { resolveAgentResponse } from './app/services/agent-response.mjs';
    const ids = JSON.parse(process.argv[1]);
    const pool = new Pool({connectionString:process.env.DATABASE_URL});
    try {
      const ownerId = (await pool.query('SELECT owner_id FROM projects WHERE id=$1',[ids.projectId])).rows[0].owner_id;
      const base={projectId:ids.projectId,ownerId};
      const make=(type,entryId)=>({version:1,blocks:[{type:'markdown',text:'Saved record.'},{type,entryId}]});
      const resolve=(response,availableCards)=>resolveAgentResponse(pool,{...base,response,availableCards});
      const offered=[{type:'marker_set',entryId:ids.markerId}];
      const valid=await resolve(make('marker_set',ids.markerId),offered);
      assert.equal(valid.blocks[1].entry.id,ids.markerId);
      for(const id of [ids.otherMarkerId,ids.foreignMarkerId,ids.missingId]) {
        await assert.rejects(resolve(make('marker_set',id),[{type:'marker_set',entryId:id}]),{code:'agent_card_unavailable'});
      }
      await assert.rejects(resolve(make('sample_context',ids.markerId),[{type:'sample_context',entryId:ids.markerId}]),{code:'agent_card_unavailable'});
      await assert.rejects(resolve(make('marker_set',ids.markerId),[]),{code:'agent_card_unavailable'});
      for(const bad of [
        {version:2,blocks:[{type:'markdown',text:'x'}]},
        {version:1,blocks:[{type:'html',html:'<script>alert(1)</script>'}]},
        {version:1,blocks:[{type:'markdown',text:'x'},{type:'marker_set',entryId:ids.markerId,payload:{genes:['FAKE']}}]},
        {version:1,blocks:Array.from({length:13},()=>({type:'markdown',text:'x'}))},
        {version:1,blocks:[{type:'markdown',text:'x'},{type:'marker_set',entryId:'invalid'}]},
        'not json'
      ]) await assert.rejects(resolve(bad,offered),{code:'agent_response_invalid'});
      // A real legacy row verifies backward reading without another model call.
      await pool.query("INSERT INTO agent_turns(project_id,owner_id,submission_id,prompt,response_text,status) VALUES ($1,$2,$3,'Legacy history check','**Legacy answer**','completed')",[ids.projectId,ownerId,ids.legacySubmissionId]);
      console.log('Real database: owned resolution, denied foreign/project/missing/type references, strict format and legacy storage passed.');
    } finally {await pool.end();}
  `;
  const checked = await execute("docker", [
    "compose",
    "exec",
    "-T",
    "agent-worker",
    "node",
    "--input-type=module",
    "-e",
    boundaryScript,
    JSON.stringify({
      projectId,
      markerId: marker.id,
      otherMarkerId: otherMarker.id,
      foreignMarkerId: foreignMarker.id,
      missingId: randomUUID(),
      legacySubmissionId: randomUUID(),
    }),
  ]);
  expect(checked.stdout).toContain("strict format and legacy storage passed");
  await page.reload();
  await expect(
    page
      .locator('[data-chat-role="assistant"] strong')
      .filter({ hasText: "Legacy answer" }),
  ).toHaveCount(1);
  await sampleCard.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("agent-cards-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await sampleCard.scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("form", { name: "Message the agent" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("agent-cards-mobile-sample.png"),
    fullPage: true,
  });
  await markerCard.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("agent-cards-mobile-markers.png"),
    fullPage: true,
  });
});
