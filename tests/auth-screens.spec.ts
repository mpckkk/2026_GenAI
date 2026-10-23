import { test, expect } from "@playwright/test";

test("branded auth screens, mobile layout and real validation", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to Celloras" }),
  ).toHaveAttribute("href", "http://localhost:3100");
  await page.screenshot({
    path: testInfo.outputPath("login-desktop.png"),
    fullPage: true,
  });
  await page.getByLabel("Password", { exact: true }).fill("visibility-check");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByLabel("Password", { exact: true }).clear();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("login-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("login-validation.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Confirm password", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("register-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: testInfo.outputPath("register-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("register-validation.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Already have an account? Log in" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
