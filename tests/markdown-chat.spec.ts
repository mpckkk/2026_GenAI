import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";

test("real agent Markdown renders safely and fits the mobile conversation", async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  await page.goto("/register");
  await page
    .locator('input[name="email"]')
    .fill(`markdown-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(24).toString("base64url");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
  const project = await page.request.post("/api/projects", {
    headers: { origin: "http://localhost:3100" },
    data: { name: "Markdown rendering check" },
  });
  expect(project.status()).toBe(201);
  const projectId = (await project.json()).id as string;
  await page.goto(`/app/projects/${projectId}`);

  const markdown = [
    "## Key limits include",
    "",
    "- **Shared expression:** Example formatting text.",
    "  - *Nested detail* with `inline_code`.",
    "- **Biological context:** Another formatting example.",
    "",
    "1. First step",
    "2. Second step",
    "",
    "> Example quotation, not a scientific claim.",
    "",
    "| Sample | Tissue | Stage | Identifier | Notes |",
    "| --- | --- | --- | --- | --- |",
    "| Example | Root | Unknown | example_gene | Formatting only |",
    "",
    "```text",
    `example_identifier_${"0123456789".repeat(16)}`,
    "```",
    "",
    "[Reference](https://example.org/reference)",
    "",
    "~~Old note~~ New note.[^example]",
    "",
    "- [x] Reviewed example",
    "- [ ] Pending example",
    "",
    "[^example]: Example footnote.",
    "",
    '[Unsafe link](javascript:alert("markdown-check"))',
    "",
    '<img src="https://example.org/untrusted-html.png" onerror="window.markdownExecuted=true">',
    "",
    "![Image reference](https://example.org/untrusted-markdown.png)",
  ].join("\n");
  const remoteImages: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("example.org/untrusted")) {
      remoteImages.push(request.url());
    }
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByLabel("Message Celloras", { exact: true })
    .fill(
      "This is a UI formatting check, not scientific analysis. Return the exact Markdown below with no introduction and no outer code fence. Keep the inert HTML and URL examples literally as text; do not execute anything or fetch any links.\n\n" +
        markdown,
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const turn = page.locator("[data-chat-turn-id]").first();
  await expect(turn).toHaveAttribute("data-chat-status", /completed|failed/, {
    timeout: 180000,
  });
  await expect(turn).toHaveAttribute("data-chat-status", "completed");
  // Require the live model to have returned the unsafe examples before claiming
  // the browser exercised the renderer's HTML/URL boundary.
  const saved = await (
    await page.request.get(`/api/projects/${projectId}/chat`)
  ).json();
  expect(saved.turns[0].response).toContain(
    'javascript:alert("markdown-check")',
  );
  expect(saved.turns[0].response).toContain(
    'onerror="window.markdownExecuted=true"',
  );
  await page.reload();
  const reply = turn.locator('[data-chat-role="assistant"]');
  await expect(
    reply.getByRole("heading", { name: "Key limits include" }),
  ).toBeVisible();
  await expect(reply.locator("strong").first()).toHaveText(
    "Shared expression:",
  );
  await expect(reply.locator("ul ul li")).toContainText("Nested detail");
  await expect(reply.locator("em")).toHaveText("Nested detail");
  await expect(reply.locator("blockquote")).toContainText("Example quotation");
  await expect(reply.getByRole("table")).toBeVisible();
  await expect(reply.locator("pre code")).toContainText("example_identifier_");
  await expect(reply.locator("del")).toHaveText("Old note");
  await expect(reply.getByRole("checkbox").first()).toBeChecked();
  await expect(reply.getByRole("checkbox").first()).toBeDisabled();
  await expect(
    reply.getByRole("link", { name: "Reference", exact: true }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    reply.getByRole("link", { name: "Unsafe link", exact: true }),
  ).toHaveCount(0);
  await expect(reply.locator("img, script, iframe")).toHaveCount(1); // Only the trusted Celloras avatar.
  await expect(reply.locator('img[src*="example.org"]')).toHaveCount(0);
  expect(remoteImages).toEqual([]);
  expect(await page.evaluate(() => "markdownExecuted" in window)).toBe(false);
  const footnote = reply.locator('a[href*="fn-example"]').first();
  expect(
    await footnote.evaluate((link) => {
      const target = document.getElementById(
        link.getAttribute("href")!.slice(1),
      );
      const label = document.getElementById(
        link.getAttribute("aria-describedby")!,
      );
      return Boolean(target && label);
    }),
  ).toBe(true);

  const scroller = page.getByLabel("Conversation messages", { exact: true });
  await reply
    .getByRole("heading", { name: "Key limits include" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("markdown-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("form", { name: "Message the agent" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await scroller.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  const tableRegion = reply.getByRole("region", { name: "Response table" });
  expect(
    await tableRegion.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await reply
      .locator("pre")
      .evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  await reply
    .getByRole("heading", { name: "Key limits include" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("markdown-mobile.png"),
    fullPage: true,
  });
  await tableRegion.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("markdown-mobile-table.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
