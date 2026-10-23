import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";

async function contextPanel(page: Page) {
  const toggle = page.getByRole("button", {
    name: "Study context",
    exact: true,
  });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  return page.getByRole("complementary", { name: "Study context" });
}

test("chat workspace keeps drafts, saved context and accessible panels across desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`workspace-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
  await page
    .getByRole("button", { name: "New experiment", exact: true })
    .click();
  await page.getByLabel("Experiment name").fill("Soybean root study");
  await page
    .getByRole("button", { name: "Create experiment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Soybean root study", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Your experiments", exact: true })
      .getByRole("link", { name: "Soybean root study" }),
  ).toHaveAttribute("aria-current", "page");
  const composer = page.getByRole("form", { name: "Message the agent" });
  await expect(composer).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath("workspace-desktop-empty.png"),
  });

  const draft = "Keep this question while I update my sample context.";
  await page.getByLabel("Message Celloras", { exact: true }).fill(draft);
  const panel = await contextPanel(page);
  await panel
    .getByRole("button", { name: "Edit context", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Research workspace",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Tissue", { exact: false }).fill("Root");
  await dialog
    .getByLabel("Sample label", { exact: false })
    .fill("Root sample A");
  await dialog
    .getByRole("button", { name: "Save sample context", exact: true })
    .click();
  await expect(
    dialog.getByText("Sample context saved.", { exact: false }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close research workspace" })
    .click();
  await expect(panel).toContainText("Root sample A");
  await expect(
    page.getByLabel("Message Celloras", { exact: true }),
  ).toHaveValue(draft);

  await panel.getByRole("button", { name: "Add note", exact: true }).click();
  const note = dialog.getByLabel("Add a note to the conversation", {
    exact: true,
  });
  await note.fill("An unfinished note stays here.");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Add note", exact: true }),
  ).toBeFocused();
  await panel.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(note).toHaveValue("An unfinished note stays here.");
  await dialog.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    dialog.getByText("Note saved to this experiment.", { exact: false }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close research workspace" })
    .click();
  await expect(panel).toContainText("An unfinished note stays here.");
  // A server refresh adopts newer context only while its editor is untouched.
  const projectId = new URL(page.url()).pathname.split("/").at(-1);
  async function saveExternalContext(tissue: string) {
    const response = await page.request.post(
      `/api/projects/${projectId}/research`,
      {
        headers: { origin: "http://localhost:3100" },
        data: {
          submissionId: randomUUID(),
          command: {
            kind: "context",
            context: {
              speciesId: "glycine-max",
              tissue,
              sampleLabel: "Root sample A",
              developmentalStage: null,
              genomeVersion: null,
              geneIdNamespace: null,
              notes: "",
            },
          },
        },
      },
    );
    expect(response.ok()).toBe(true);
  }
  await saveExternalContext("Leaf");
  await panel.getByRole("button", { name: "Add note", exact: true }).click();
  await note.fill("Refresh the saved sample context.");
  await dialog.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    dialog.getByText("Note saved to this experiment.", { exact: false }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Plant & sample", exact: true })
    .click();
  await expect(dialog.getByLabel("Tissue", { exact: false })).toHaveValue(
    "Leaf",
  );
  await dialog
    .getByLabel("Tissue", { exact: false })
    .fill("My unfinished tissue draft");
  await dialog
    .getByRole("button", { name: "Close research workspace" })
    .click();
  await saveExternalContext("Stem");
  await panel.getByRole("button", { name: "Add note", exact: true }).click();
  await note.fill("Keep my unfinished context draft.");
  await dialog.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    dialog.getByText("Note saved to this experiment.", { exact: false }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Plant & sample", exact: true })
    .click();
  await expect(dialog.getByLabel("Tissue", { exact: false })).toHaveValue(
    "My unfinished tissue draft",
  );
  await dialog
    .getByRole("button", { name: "Close research workspace" })
    .click();
  await expect(
    panel.getByRole("definition").filter({ hasText: "Stem" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  // Default compact mode shows chat; context is an explicit secondary view.
  await expect(composer).toBeVisible();
  await expect(composer).toBeInViewport();
  await expect(
    page.getByLabel("Message Celloras", { exact: true }),
  ).toHaveValue(draft);
  await page.screenshot({
    path: testInfo.outputPath("workspace-mobile-chat.png"),
  });
  await contextPanel(page);
  await expect(panel).toContainText("Root sample A");
  await expect(composer).not.toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("workspace-mobile-context.png"),
  });
  await page.getByRole("button", { name: "Back to chat", exact: true }).click();
  await expect(
    page.getByLabel("Message Celloras", { exact: true }),
  ).toHaveValue(draft);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  const navigation = page.getByRole("dialog", {
    name: "Workspace navigation",
    exact: true,
  });
  await expect(
    navigation.getByRole("link", { name: "Soybean root study", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("workspace-mobile-navigation.png"),
  });
  await page.keyboard.press("Escape");
  await expect(navigation).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await contextPanel(page);
  await expect(panel).toContainText("Root sample A");
  await expect(panel).toContainText("An unfinished note stays here.");
});
