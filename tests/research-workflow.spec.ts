import { test, expect, type Page, type APIResponse } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import type { ResearchWorkspace } from "../app/core/research";

const origin = "http://localhost:3100";
const headers = { origin };

async function register(page: Page) {
  const email = `research-${randomBytes(8).toString("hex")}@example.test`;
  const password = randomBytes(24).toString("base64url");
  await page.goto("/register");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(`${origin}/app`);
  return { email, password };
}

async function createExperiment(page: Page, name: string) {
  const response = await page.request.post("/api/projects", {
    headers,
    data: { name },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

function researchDialog(page: Page) {
  return page.getByRole("dialog", { name: "Research workspace", exact: true });
}

async function openResearch(page: Page, action = "Research records") {
  const dialog = researchDialog(page);
  if (await dialog.isVisible()) {
    await dialog
      .getByRole("button", {
        name:
          action === "Research records" ? "Research records" : "Edit research",
        exact: true,
      })
      .click();
  } else {
    const actionButton = page.getByRole("button", {
      name: action,
      exact: true,
    });
    if (!(await actionButton.isVisible()))
      await page
        .getByRole("button", { name: "Study context", exact: true })
        .click();
    await actionButton.click();
  }
  await expect(dialog).toBeVisible();
}

async function editResearch(page: Page) {
  await researchDialog(page)
    .getByRole("button", { name: "Edit research", exact: true })
    .click();
}

async function viewSavedEntry(page: Page) {
  await researchDialog(page)
    .getByRole("link", { name: "View saved entry", exact: true })
    .click();
}

async function closeResearch(page: Page) {
  await researchDialog(page)
    .getByRole("button", { name: "Close research workspace", exact: true })
    .click();
  await expect(researchDialog(page)).not.toBeVisible();
}

const context = {
  speciesId: "glycine-max",
  tissue: "Root",
  sampleLabel: "Sample A",
  developmentalStage: null,
  genomeVersion: null,
  geneIdNamespace: null,
  notes: "",
};

test("conversation forms save real records and survive login, with responsive rendering", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const credentials = await register(page);
  await page.getByLabel("Experiment name").fill("Soybean root conversation");
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Soybean root conversation" }),
  ).toBeVisible();
  const experimentUrl = page.url();
  const projectId = experimentUrl.split("/").at(-1)!;
  const note =
    'Inspect cluster 4. <img src=x onerror="window.cellorasInjected=true">';
  await openResearch(page, "Add note");
  await page.getByLabel("Add a note to the conversation").fill(note);
  await closeResearch(page);
  await openResearch(page, "Add note");
  await expect(page.getByLabel("Add a note to the conversation")).toHaveValue(
    note,
  );
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page.getByText("Note saved to this experiment.", { exact: false }),
  ).toBeVisible();
  await viewSavedEntry(page);
  await expect(page.locator('[data-entry-kind="message"]')).toContainText(note);
  expect(
    await page.evaluate(() => Reflect.get(window, "cellorasInjected")),
  ).toBeUndefined();
  await editResearch(page);
  await researchDialog(page)
    .getByRole("button", { name: "Plant & sample", exact: true })
    .click();
  await page.getByLabel("Tissue", { exact: false }).fill("Root");
  await page.getByLabel("Sample label", { exact: false }).fill("Sample A");
  await page
    .getByRole("button", { name: "Save sample context", exact: true })
    .click();
  await expect(
    page.getByText("Sample context saved.", { exact: false }),
  ).toBeVisible();
  await researchDialog(page)
    .getByRole("button", { name: "Add markers", exact: true })
    .click();
  const raw = "Glyma.01G000100, Glyma.01G000100;\nglyma.01g000100";
  await page
    .getByLabel("Cluster or marker-set label", { exact: false })
    .fill("Cluster 4");
  await page.getByLabel("Marker genes", { exact: true }).fill(" , ; ");
  await page.getByRole("button", { name: "Save markers", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Add to conversation" })
      .getByRole("alert"),
  ).toContainText("200 distinct");
  await expect(page.getByLabel("Marker genes", { exact: true })).toHaveValue(
    " , ; ",
  );
  await page.getByLabel("Marker genes", { exact: true }).fill(raw);
  await page.getByRole("button", { name: "Save markers", exact: true }).click();
  await expect(
    page.getByText("Markers saved to this experiment.", { exact: false }),
  ).toBeVisible();
  await viewSavedEntry(page);
  const markerCard = page.locator('[data-entry-kind="markers"]');
  await expect(
    markerCard
      .getByRole("list", { name: "Parsed markers" })
      .getByRole("listitem"),
  ).toHaveCount(2);
  await markerCard.getByText("Original marker text", { exact: true }).click();
  await expect(markerCard.locator("pre")).toHaveText(raw);
  await editResearch(page);
  await researchDialog(page)
    .getByRole("button", { name: "Record review", exact: true })
    .click();
  await page
    .getByLabel("Your supporting evidence", { exact: false })
    .fill("Researcher observation; reference lookup still pending.");
  await page
    .getByLabel("Review notes", { exact: false })
    .fill("Cell identity unresolved.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await viewSavedEntry(page);
  await expect(page.locator('[data-entry-kind="manual_review"]')).toContainText(
    "Cell type undecided",
  );
  await page.reload();
  await openResearch(page);
  await expect(page.locator('[data-entry-kind="markers"]')).toHaveCount(1);
  await expect(page.locator('[data-entry-kind="manual_review"]')).toHaveCount(
    1,
  );
  await closeResearch(page);
  const logo = page.getByRole("img", { name: "Celloras", exact: true });
  await expect(logo).toBeVisible();
  expect(
    await logo.evaluate(
      (element) => (element as HTMLImageElement).naturalWidth,
    ),
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath("conversation-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await openResearch(page, "Add markers");
  await expect(page.getByLabel("Marker genes", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("conversation-mobile.png"),
    fullPage: true,
  });
  await researchDialog(page)
    .getByRole("button", { name: "Research records", exact: true })
    .click();
  await page
    .locator('[data-entry-kind="manual_review"]')
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("conversation-mobile-review.png"),
  });
  await closeResearch(page);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
  expect(
    (await page.request.get(`/api/projects/${projectId}/research`)).status(),
  ).toBe(401);
  await page.goto("/login");
  await page.locator('input[name="username"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(`${origin}/app`);
  await page.goto(experimentUrl);
  await openResearch(page);
  await expect(page.locator('[data-entry-kind="message"]')).toContainText(note);
  await expect(page.locator('[data-entry-kind="manual_review"]')).toContainText(
    "Cell identity unresolved.",
  );
});

test("real research storage: retries, context snapshots, pagination and owner isolation", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await register(page);
  const projectId = await createExperiment(
    page,
    "Research storage verification",
  );
  const url = `/api/projects/${projectId}/research`;
  const post = (command: unknown, submissionId = randomUUID()) =>
    page.request.post(url, { headers, data: { submissionId, command } });

  const savedContextResponse = await post({ kind: "context", context });
  expect(savedContextResponse.status()).toBe(200);
  const savedContext = await savedContextResponse.json();
  const markerCommand = {
    kind: "markers",
    speciesId: "glycine-max",
    label: "Cluster 4",
    markersRaw: "Glyma.01G000100, Glyma.01G000100;\nglyma.01g000100",
    contextEntryId: savedContext.id,
  };
  const markerSubmission = randomUUID();
  const duplicateResponses = await Promise.all([
    post(markerCommand, markerSubmission),
    post(markerCommand, markerSubmission),
  ]);
  for (const response of duplicateResponses)
    expect(response.status()).toBe(200);
  const marker = await duplicateResponses[0].json();
  expect((await duplicateResponses[1].json()).id).toBe(marker.id);
  expect(marker.genes).toEqual(["Glyma.01G000100", "glyma.01g000100"]);
  expect(marker.markersRaw).toBe(markerCommand.markersRaw);
  expect(marker.context.tissue).toBe("Root");
  expect(
    (
      await post({ ...markerCommand, label: "Changed" }, markerSubmission)
    ).status(),
  ).toBe(409);

  expect(
    (
      await post({ kind: "context", context: { ...context, tissue: "Leaf" } })
    ).status(),
  ).toBe(200);
  const reviewResponse = await post({
    kind: "manual_review",
    markerEntryId: marker.id,
    cellType: null,
    evidenceText: "Researcher note, not verified reference evidence",
    notes: "Unresolved",
  });
  expect(reviewResponse.status()).toBe(200);
  expect((await reviewResponse.json()).cellType).toBeNull();
  const current = await (await page.request.get(url)).json();
  expect(current.context.context.tissue).toBe("Leaf");
  expect(current.markers[0].context.tissue).toBe("Root");
  expect(
    current.page.entries.filter(
      (entry: { id: string }) => entry.id === marker.id,
    ),
  ).toHaveLength(1);

  expect(
    (
      await post({
        kind: "context",
        context: { ...context, speciesId: "unsupported-plant" },
      })
    ).status(),
  ).toBe(400);
  expect((await post({ ...markerCommand, markersRaw: "  " })).status()).toBe(
    400,
  );
  expect(
    (
      await post({
        ...markerCommand,
        markersRaw: Array.from({ length: 201 }, (_, i) => `Gene${i}`).join(","),
      })
    ).status(),
  ).toBe(400);
  expect(
    (await post({ kind: "message", text: "x".repeat(10001) })).status(),
  ).toBe(400);
  expect(
    (await post({ kind: "assistant", text: "Invented result" })).status(),
  ).toBe(400);
  expect((await page.request.get(`${url}?before=invalid`)).status()).toBe(400);
  expect(
    (
      await page.request.get(`${url}?before=999999999999999999999999999`)
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(url, {
        data: {
          submissionId: randomUUID(),
          command: { kind: "message", text: "Wrong origin" },
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(url, { headers, data: "x".repeat(131073) })
    ).status(),
  ).toBe(413);

  const otherProject = await createExperiment(page, "Separate experiment");
  expect(
    (
      await page.request.post(`/api/projects/${otherProject}/research`, {
        headers,
        data: { submissionId: randomUUID(), command: markerCommand },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await post({
        kind: "manual_review",
        markerEntryId: savedContext.id,
        cellType: "Entered label",
        evidenceText: "",
        notes: "",
      })
    ).status(),
  ).toBe(400);

  const seeded = await Promise.all(
    Array.from({ length: 55 }, (_, i) =>
      post({ kind: "message", text: `Pagination note ${i}` }),
    ),
  );
  for (const response of seeded) expect(response.status()).toBe(200);
  const observed: { id: string; position: string }[] = [];
  let before: string | null = null;
  do {
    const response: APIResponse = await page.request.get(
      url + (before ? `?before=${before}` : ""),
    );
    expect(response.status()).toBe(200);
    const result: ResearchWorkspace = await response.json();
    expect(result.page.entries.length).toBeLessThanOrEqual(50);
    const positions = result.page.entries.map((entry: { position: string }) =>
      BigInt(entry.position),
    );
    for (let i = 1; i < positions.length; i++)
      expect(positions[i] > positions[i - 1]).toBe(true);
    observed.push(...result.page.entries);
    before = result.page.nextBefore;
  } while (before);
  expect(observed).toHaveLength(59);
  expect(new Set(observed.map((entry) => entry.id)).size).toBe(59);

  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await register(other);
    expect((await other.request.get(url)).status()).toBe(404);
    expect(
      (
        await other.request.post(url, {
          headers,
          data: {
            submissionId: randomUUID(),
            command: { kind: "message", text: "Forbidden" },
          },
        })
      ).status(),
    ).toBe(404);
    const ownedByOther = await createExperiment(
      other,
      "Other account experiment",
    );
    expect(
      (
        await other.request.post(`/api/projects/${ownedByOther}/research`, {
          headers,
          data: { submissionId: randomUUID(), command: markerCommand },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await second.close();
  }
});

test("older marker sets remain reviewable beyond the recent-marker window", async ({
  page,
}) => {
  test.setTimeout(120000);
  await register(page);
  const projectId = await createExperiment(
    page,
    "Older marker history verification",
  );
  const url = `/api/projects/${projectId}/research`;
  const postMarker = (label: string) =>
    page.request.post(url, {
      headers,
      data: {
        submissionId: randomUUID(),
        command: {
          kind: "markers",
          speciesId: "glycine-max",
          label,
          markersRaw: "GeneA",
          contextEntryId: null,
        },
      },
    });
  const firstResponse = await postMarker("Oldest cluster");
  expect(firstResponse.status()).toBe(200);
  const first = await firstResponse.json();
  const recent = await Promise.all(
    Array.from({ length: 100 }, (_, i) => postMarker(`Recent cluster ${i}`)),
  );
  for (const response of recent) expect(response.status()).toBe(200);
  const before = (BigInt(first.position) + BigInt(1)).toString();
  const older = await (
    await page.request.get(`${url}?before=${before}`)
  ).json();
  expect(
    older.page.entries.some((entry: { id: string }) => entry.id === first.id),
  ).toBe(true);
  expect(
    older.markers.some((entry: { id: string }) => entry.id === first.id),
  ).toBe(true);
  const latestWorkspace: ResearchWorkspace = await (
    await page.request.get(url)
  ).json();
  const newestMarker = latestWorkspace.markers[0];
  await page.goto(`/app/projects/${projectId}`);
  await openResearch(page);
  await closeResearch(page);
  await page
    .getByRole("button")
    .filter({
      has: page.getByText(newestMarker.label!, { exact: true }),
    })
    .click();
  await expect(
    researchDialog(page).locator('[data-entry-kind="markers"]'),
  ).toHaveCount(1);
  await expect(
    researchDialog(page).locator('[data-entry-kind="markers"]'),
  ).toHaveAttribute("id", `entry-${newestMarker.id}`);
  await researchDialog(page)
    .getByRole("link", { name: "View older entries", exact: true })
    .click();
  await expect(page).toHaveURL(/before=/);
  await expect(researchDialog(page)).toBeVisible();
  const historyCursor = new URL(page.url()).searchParams.get("before")!;
  const historyWorkspace: ResearchWorkspace = await (
    await page.request.get(`${url}?before=${historyCursor}`)
  ).json();
  const expectedHistoryIds = historyWorkspace.page.entries.map(
    (entry) => `entry-${entry.id}`,
  );
  await expect(researchDialog(page).locator("[data-entry-kind]")).toHaveCount(
    expectedHistoryIds.length,
  );
  expect(
    await researchDialog(page)
      .locator("[data-entry-kind]")
      .evaluateAll((elements) => elements.map((element) => element.id)),
  ).toEqual(expectedHistoryIds);
  await expect(
    researchDialog(page).locator(`#entry-${newestMarker.id}`),
  ).toHaveCount(0);
  // Switching views must not resurrect the previously focused summary record.
  await editResearch(page);
  await researchDialog(page)
    .getByRole("button", { name: "Research records", exact: true })
    .click();
  await expect(researchDialog(page).locator("[data-entry-kind]")).toHaveCount(
    expectedHistoryIds.length,
  );
  await page.goto(`/app/projects/${projectId}?before=${before}`);
  await expect(researchDialog(page)).toBeVisible();
  await editResearch(page);
  await researchDialog(page)
    .getByRole("button", { name: "Record review", exact: true })
    .click();
  await page.getByLabel("Marker set", { exact: true }).selectOption(first.id);
  await page
    .getByLabel("Review notes", { exact: false })
    .fill("Revisited the original cluster.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await viewSavedEntry(page);
  await expect(page.locator('[data-entry-kind="manual_review"]')).toContainText(
    "Oldest cluster",
  );
});

test("a committed save with a lost response can be retried or explicitly replaced", async ({
  page,
}) => {
  test.setTimeout(120000);
  await register(page);
  const projectId = await createExperiment(page, "Lost response verification");
  const experimentUrl = `${origin}/app/projects/${projectId}`;
  await page.goto(experimentUrl);
  let dropped = false;
  await page.route(experimentUrl, async (route) => {
    if (
      !dropped &&
      route.request().method() === "POST" &&
      route.request().headers()["next-action"]
    ) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true); // The actual server action committed before the network loss.
      dropped = true;
      await route.abort("failed");
    } else {
      await route.continue();
    }
  });
  await openResearch(page, "Add note");
  const input = page.getByLabel("Add a note to the conversation");
  await input.fill("Original committed note");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Add to conversation" })
      .getByRole("alert"),
  ).toContainText("could not be confirmed");
  await expect(input).toHaveValue("Original committed note");
  const saved = await (
    await page.request.get(`/api/projects/${projectId}/research`)
  ).json();
  expect(saved.page.entries).toHaveLength(1);
  expect(saved.page.entries[0].text).toBe("Original committed note");
  await input.fill("A different follow-up note");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Add to conversation" })
      .getByRole("alert"),
  ).toContainText("different content");
  const saveAsNew = page.getByRole("button", {
    name: "Save as a new entry",
    exact: true,
  });
  await expect(saveAsNew).toBeVisible();
  await saveAsNew.click();
  await expect(
    page.getByText("Note saved to this experiment.", { exact: false }),
  ).toBeVisible();
  const after = await (
    await page.request.get(`/api/projects/${projectId}/research`)
  ).json();
  expect(after.page.entries).toHaveLength(2);
  expect(
    after.page.entries.map((entry: { text: string }) => entry.text),
  ).toEqual(["Original committed note", "A different follow-up note"]);
});
