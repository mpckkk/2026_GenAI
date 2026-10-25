import { test, expect, type Page } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { MarkerImportReceipt } from "../app/core/marker-import";
import type { ChatWorkspace } from "../app/core/chat";

const headers = { origin: "http://localhost:3100" };
const context = {
  speciesId: "glycine-max",
  tissue: "root",
  genomeVersion: "Wm82v4",
  geneIdNamespace: "Glyma",
  sampleLabel: null,
  developmentalStage: null,
  notes: "Upload acceptance",
};
async function register(page: Page) {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`upload-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
}
async function project(page: Page) {
  const response = await page.request.post("/api/projects", {
    headers,
    data: { name: "Uploaded soybean markers" },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

test("CSV preview, original download, persistent groups and real OpenShell evidence", async ({
  page,
}, info) => {
  test.setTimeout(360000);
  await register(page);
  const id = await project(page);
  const endpoint = `/api/projects/${id}/marker-imports`;
  await page.goto(`/app/projects/${id}`);
  await expect(page.getByText("Agent connected", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByRole("button", { name: "Upload markers", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Upload marker genes" });
  await dialog
    .getByRole("button", { name: "Use example", exact: true })
    .click();
  await expect(dialog).toContainText("Ready to import 3 groups");
  await expect(dialog.getByLabel("Tissue", { exact: true })).toHaveValue(
    "root",
  );
  await expect(dialog.getByLabel("Genome / annotation version")).toHaveValue(
    "Wm82v4",
  );
  await page.screenshot({
    path: info.outputPath("upload-preview-desktop.png"),
  });
  // Exercise the actual file picker as well as the included example.
  const bytes = await readFile("public/examples/soybean-root-markers.csv");
  await dialog.getByLabel("Marker CSV", { exact: true }).setInputFiles({
    name: "my-soybean.csv",
    mimeType: "text/csv",
    buffer: bytes,
  });
  await expect(dialog).toContainText("my-soybean.csv");
  await dialog
    .getByRole("button", { name: "Import marker groups", exact: true })
    .click();
  await expect(dialog).toContainText("Choose a group to explore");
  const receipts: MarkerImportReceipt[] = await (
    await page.request.get(endpoint)
  ).json();
  expect(receipts).toHaveLength(1);
  expect(receipts[0].groups.map((g) => g.geneCount)).toEqual([4, 3, 3]);
  expect(receipts[0].sha256).toBe(
    createHash("sha256").update(bytes).digest("hex"),
  );
  const original = await page.request.get(
    `${endpoint}?download=${receipts[0].id}`,
  );
  expect(await original.body()).toEqual(bytes);
  // Explicit handles must still work after the imported group leaves the recent 30 records.
  for (let i = 0; i < 31; i++) {
    const response = await page.request.post(`/api/projects/${id}/research`, {
      headers,
      data: {
        submissionId: randomUUID(),
        command: { kind: "message", text: `Later research note ${i}` },
      },
    });
    expect(response.ok()).toBe(true);
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Upload markers", exact: true })
    .click();
  await expect(dialog).toContainText("my-soybean.csv");
  await dialog.getByRole("button", { name: "Close marker upload" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page
    .getByRole("button", { name: "Upload markers", exact: true })
    .click();
  await expect(dialog).toContainText("my-soybean.csv");
  await page.screenshot({ path: info.outputPath("upload-saved-mobile.png") });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await dialog
    .getByRole("button", { name: "Find cell-type evidence" })
    .first()
    .click();
  const turn = page.locator("[data-chat-turn-id]").last();
  await expect(turn).toHaveAttribute("data-chat-status", /completed|failed/, {
    timeout: 240000,
  });
  await expect(turn).toHaveAttribute("data-chat-status", "completed");
  const card = turn.getByRole("region", { name: "Marker evidence card" });
  await expect(card).toBeVisible();
  const workspace: ChatWorkspace = await (
    await page.request.get(`/api/projects/${id}/chat`)
  ).json();
  const block = workspace.turns
    .at(-1)
    ?.responseDocument?.blocks.find((b) => b.type === "marker_evidence");
  if (block?.type !== "marker_evidence")
    throw new Error("Real agent did not render marker evidence");
  expect(block.result.status).toBe("matches_found");
  expect(block.result.marker.id).toBe(receipts[0].groups[0].entryId);
  expect(block.result.source.genomeVersion).toBe("Wm82v4");
  expect(block.result.candidates.map((c) => c.cellType)).toContain("Root hair");
  expect(block.result.matchedGenes).toHaveLength(4);
  expect(block.result.source.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  await card.getByText("Root hair", { exact: true }).click();
  await expect(card.getByRole("link", { name: "Source table ↗" })).toHaveCount(
    4,
  );
  await card.getByText("Evidence details", { exact: true }).first().click();
  await expect(card).toContainText("Table S2, Sheet1 row");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("upload-real-evidence.png") });
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Marker evidence card" }),
  ).toBeVisible();
  console.log(
    JSON.stringify({
      event: "marker.upload.e2e",
      projectId: id,
      turnId: workspace.turns.at(-1)?.id,
      importId: receipts[0].id,
      matchedGenes: block.result.matchedGenes.length,
    }),
  );
});

test("owned atomic imports reject bad input, preserve CSV bytes and replay safely", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await register(page);
  const id = await project(page),
    endpoint = `/api/projects/${id}/marker-imports`;
  const input = {
    submissionId: randomUUID(),
    fileName: "quoted.csv",
    csv: '\uFEFFcluster,gene,notes\r\n"Group, A",Glyma.01G224900,"line one\r\nline two"\r\n"Group, A",Glyma.01G224900,"double ""quote"""\r\n',
    columns: { group: "cluster", gene: "gene" },
    context,
  };
  const post = (data: unknown) =>
    page.request.post(endpoint, { headers, data });
  const first = await post(input);
  expect(first.status(), await first.text()).toBe(200);
  const receipt: MarkerImportReceipt = await first.json();
  expect(receipt.groups[0]).toMatchObject({ label: "Group, A", geneCount: 1 });
  expect(
    await (await page.request.get(`${endpoint}?download=${receipt.id}`)).body(),
  ).toEqual(Buffer.from(input.csv));
  const replay = await post(input);
  expect(await replay.json()).toEqual(receipt);
  expect(
    (
      await post({ ...input, csv: input.csv + "B,Glyma.03G007500,x\r\n" })
    ).status(),
  ).toBe(409);
  for (const csv of [
    'cluster,gene\n"broken,Glyma.01G224900',
    "cluster,gene\nA,",
    "cluster,gene\nA,Gene,extra",
    "cluster,cluster\nA,Gene",
    "cluster,gene\nA,Gene\u0000",
  ]) {
    expect(
      (await post({ ...input, submissionId: randomUUID(), csv })).status(),
    ).toBe(400);
  }
  expect(
    (
      await post({
        ...input,
        submissionId: randomUUID(),
        csv: "x".repeat(262145),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await post({
        ...input,
        submissionId: randomUUID(),
        columns: { group: "missing", gene: "gene" },
      })
    ).status(),
  ).toBe(400);
  const tooMany =
    "cluster,gene\n" +
    Array.from({ length: 21 }, (_, i) => `Group${i},Glyma.01G224900`).join(
      "\n",
    );
  expect(
    (
      await post({ ...input, submissionId: randomUUID(), csv: tooMany })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(endpoint, {
        headers: { origin: "https://example.test" },
        data: input,
      })
    ).status(),
  ).toBe(403);
  expect(await (await page.request.get(endpoint)).json()).toHaveLength(1);
  const research = await (
    await page.request.get(`/api/projects/${id}/research`)
  ).json();
  expect(research.page.entries).toHaveLength(2);
  const otherContext = await browser.newContext(),
    other = await otherContext.newPage();
  try {
    expect((await other.request.get(endpoint)).status()).toBe(401);
    await register(other);
    expect((await other.request.get(endpoint)).status()).toBe(404);
    expect(
      (await other.request.get(`${endpoint}?download=${receipt.id}`)).status(),
    ).toBe(404);
    expect(
      (await other.request.post(endpoint, { headers, data: input })).status(),
    ).toBe(404);
  } finally {
    await otherContext.close();
  }
});
