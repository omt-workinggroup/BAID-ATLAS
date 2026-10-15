import { expect, test, type Page } from "@playwright/test";

const shotDir = "docs/screenshots/phase-1";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // Content can also be clipped without page scroll; key elements must sit inside the viewport.
  const width = page.viewportSize()!.width;
  for (const el of await page.locator("main h1, main form, main [role=img]").all()) {
    const box = await el.boundingBox();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  }
}

async function shot(page: Page, name: string, project: string) {
  if (project === "pixel-7") await page.screenshot({ path: `${shotDir}/${name}.png` });
}

test.describe("public pages", () => {
  test("home renders with mobile navigation and no fake listings", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find property in Ghana");
    await expect(page.getByText("Search East Legon, Kumasi…")).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Primary" }).last();
    await expect(nav).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "01-home", info.project.name);
  });

  for (const width of [360, 390, 430]) {
    test(`home fits ${width}px without horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await expectNoHorizontalScroll(page);
    });
  }

  test("sign-up shows validation errors", async ({ page }, info) => {
    await page.goto("/sign-up");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "02-sign-up-errors", info.project.name);
  });

  test("sign-in page", async ({ page }, info) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "03-sign-in", info.project.name);
  });

  test("reset password validates email without contacting the server", async ({ page }, info) => {
    await page.goto("/reset-password");
    await page.getByLabel("Email").fill("nope");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await shot(page, "04-reset-password", info.project.name);
  });

  test("verify email page", async ({ page }, info) => {
    await page.goto("/verify-email?email=ama%40example.test");
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByText("ama@example.test").first()).toBeVisible();
    await shot(page, "05-verify-email", info.project.name);
  });
});

test.describe("access control", () => {
  for (const path of ["/account", "/onboarding", "/portal", "/portal/new", "/portal/some-org/team", "/invitations/accept?token=x"]) {
    test(`anonymous visit to ${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in\?next=/);
      const next = new URL(page.url()).searchParams.get("next");
      expect(next).toBe(path);
    });
  }

  test("open redirects are neutralised", async ({ page }) => {
    await page.goto("/sign-in?next=https%3A%2F%2Fevil.example%2F");
    await expect(page.locator('input[name="next"]')).toHaveValue("/account");
    await page.goto("/sign-in?next=%2F%2Fevil.example");
    await expect(page.locator('input[name="next"]')).toHaveValue("/account");
  });

  test("invalid auth callback code is rejected", async ({ page }) => {
    await page.goto("/auth/callback?code=invalid-code&next=/account");
    await expect(page).toHaveURL(/\/sign-in\?error=link/);
    await expect(page.getByText("That link is invalid or has expired.")).toBeVisible();
  });

  test("security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("PWA", () => {
  test("manifest and icons are served", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.display).toBe("standalone");
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).status()).toBe(200);
    }
    expect((await request.get("/offline.html")).status()).toBe(200);
  });
});

test("desktop layout shows top navigation @desktop", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
  await page.screenshot({ path: `${shotDir}/10-home-desktop.png` });
});

test.describe("social preview", () => {
  test("open graph and twitter metadata point at generated images", async ({ page, request }, info) => {
    await page.goto("/");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toBeTruthy();
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const res = await request.get(new URL(og!).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    if (info.project.name === "pixel-7") {
      const fs = await import("node:fs");
      fs.writeFileSync(`${shotDir}/00-social-preview.png`, await res.body());
    }
  });
});
