import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

test("public landing, mobile layout and anonymous access", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Your single-cell research, in conversation.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Example layout; no analysis has run."),
  ).toBeVisible();
  await page
    .getByRole("img", { name: "Celloras", exact: true })
    .evaluateAll((images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
  await page.screenshot({
    path: testInfo.outputPath("landing-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("link", { name: /Start an experiment/ }),
  ).toBeVisible();
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.right > window.innerWidth + 1 || bounds.left < -1;
      })
      .map((element) => ({ tag: element.tagName, class: element.className })),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    JSON.stringify(overflow),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("landing-mobile.png"),
    fullPage: true,
  });
  expect((await request.get("/api/projects")).status()).toBe(401);
  expect((await request.post("/api/chat", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/health/live")).status()).toBe(200);
  await page.goto("/api/auth/callback?code=invalid&state=invalid");
  await expect(page).toHaveURL(/auth-error\?reason=invalid/);
});

async function register(page: Page, email: string, password: string) {
  await page.goto("/register");
  await expect(page).toHaveURL(/localhost:8180/);
  await page.locator('input[name="email"]').fill(email);
  await expect(page.locator('input[name="firstName"]')).toHaveCount(0);
  await expect(page.locator('input[name="lastName"]')).toHaveCount(0);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password-confirm"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3100/app");
}

test("real Keycloak accounts, project ownership and logout", async ({
  browser,
  page,
  request,
}, testInfo) => {
  expect((await request.get("/api/health/ready")).status()).toBe(200);
  const suffix = randomBytes(6).toString("hex");
  const email = `celloras-a-${suffix}@example.test`;
  const password = randomBytes(24).toString("base64url");
  await register(page, email, password);
  await page.getByLabel("Experiment name").fill(`Soybean ${suffix}`);
  await page.getByRole("button", { name: /Create experiment/ }).click();
  await expect(
    page.getByRole("heading", { name: `Soybean ${suffix}` }),
  ).toBeVisible();
  const projectUrl = page.url();
  const projectId = projectUrl.split("/").at(-1)!;
  await page.reload();
  await expect(
    page.getByText("Experiment saved", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("project.png"),
    fullPage: true,
  });
  const ownResult = await page.request.post("/api/chat", {
    headers: { origin: "http://localhost:3100" },
    data: { projectId, genes: ["NIN"] },
  });
  expect(ownResult.status()).toBe(503);
  expect((await ownResult.json()).code).toBe("INTEGRATION_PENDING");
  expect(
    (
      await page.request.post("/api/projects", {
        headers: { origin: "https://untrusted.example" },
        data: { name: "Blocked" },
      })
    ).status(),
  ).toBe(403);
  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await register(
      other,
      `celloras-b-${suffix}@example.test`,
      randomBytes(24).toString("base64url"),
    );
    expect(await (await other.request.get("/api/projects")).json()).toEqual([]);
    expect(
      (await other.request.get(`/api/projects/${projectId}`)).status(),
    ).toBe(404);
    expect(
      (
        await other.request.post("/api/chat", {
          headers: { origin: "http://localhost:3100" },
          data: { projectId, genes: ["NIN"] },
        })
      ).status(),
    ).toBe(404);
    await other.goto(projectUrl);
    await expect(
      other.getByRole("heading", { name: "Page not found." }),
    ).toBeVisible();
  } finally {
    await second.close();
  }
  await page.goto("/app/health");
  await expect(
    page.getByRole("heading", { name: "Service health" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("service-health.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Log out/ }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  expect((await page.request.get("/api/projects")).status()).toBe(401);
  await page.goto("/login?returnTo=https://untrusted.example/");
  await expect(page).toHaveURL(/localhost:8180/);
  await page.locator('input[name="username"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3100/app");
  await expect(
    page.getByRole("heading", { name: `Soybean ${suffix}` }),
  ).toBeVisible();
});
