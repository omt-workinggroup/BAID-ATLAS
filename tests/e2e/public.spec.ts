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
    await expect(page.getByPlaceholder("Search East Legon, Kumasi…")).toBeVisible();
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

  test("sign-up asks for a phone number and validates it", async ({ page }, info) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByLabel("Password")).toHaveCount(0);
    await page.getByLabel("Phone number").fill("12345");
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText("Enter a valid phone number, e.g. 024 123 4567.")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "02-sign-up-errors", info.project.name);
  });

  test("sign-in page requires a phone number", async ({ page }, info) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Continue with Google")).toHaveCount(0);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText("Enter your phone number.")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "03-sign-in", info.project.name);
  });

  test("code page without a pending number goes back to sign-in", async ({ page }) => {
    await page.goto("/verify-phone");
    await expect(page).toHaveURL(/\/sign-in\?error=expired/);
    await expect(page.getByText("That code request has expired.")).toBeVisible();
  });

  test("email and password pages are gone", async ({ page }) => {
    for (const path of ["/reset-password", "/verify-email"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
    }
  });
});

test.describe("access control", () => {
  for (const path of ["/account", "/account/saved", "/onboarding", "/portal", "/portal/new", "/portal/some-org/team", "/portal/some-org/listings/new", "/ops", "/invitations/accept?token=x"]) {
    test(`anonymous visit to ${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in\?next=/);
      const next = new URL(page.url()).searchParams.get("next");
      expect(next).toBe(path);
    });
  }

  test("open redirects are neutralised", async ({ page }) => {
    for (const url of ["/sign-in?next=https%3A%2F%2Fevil.example%2F", "/sign-in?next=%2F%2Fevil.example"]) {
      await page.goto(url);
      await expect(page.locator('input[name="next"]')).toHaveValue("/account");
    }
  });

  test("invalid auth callback code is rejected", async ({ page }) => {
    await page.goto("/auth/callback?code=invalid-code&next=/account");
    await expect(page).toHaveURL(/\/sign-in\?error=link/);
    await expect(page.getByText("That link is invalid or has expired. Please sign in again.")).toBeVisible();
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

test.describe("discovery", () => {
  test("home search submits to Explore", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Search East Legon, Kumasi…").fill("Kumasi");
    await page.getByPlaceholder("Search East Legon, Kumasi…").press("Enter");
    await expect(page).toHaveURL(/\/explore\?q=Kumasi/);
    await expect(page.locator("#q")).toHaveValue("Kumasi");
  });

  test("explore renders with purpose chips and a filter sheet", async ({ page }, info) => {
    await page.goto("/explore?purpose=long_term_rent");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("For rent");
    await expect(page.getByRole("link", { name: "For rent" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: /^Filters/ }).click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Prices are matched in the listing's own currency")).toBeVisible();
    await page.waitForTimeout(500); // let the sheet finish sliding in
    await shot(page, "20-explore-filters", info.project.name);
    await dialog.getByText("3+").click();
    await dialog.getByRole("button", { name: "Show results" }).click();
    await expect(page).toHaveURL(/beds=3/);
    await expectNoHorizontalScroll(page);
  });

  for (const [path, query] of [["/rentals", "purpose=long_term_rent"], ["/land", "type=land"], ["/short-stays", "purpose=short_stay"], ["/commercial", "type=commercial"]]) {
    test(`category hub ${path} opens Explore`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/explore\\?${query}`));
    });
  }

  test("hostile search input is neutralised", async ({ page }) => {
    await page.goto("/explore?q=accra),title.eq.x&purpose=steal&min=-1");
    await expect(page.locator("#q")).toHaveValue("accra title eq x");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explore property");
  });

  test("unknown properties show a friendly, non-indexable not-found page", async ({ page, request }) => {
    // Streaming responses keep HTTP 200; Next marks the page noindex and renders the not-found UI.
    const html = await (await request.get("/properties/does-not-exist-123")).text();
    expect(html).toContain('<meta name="robots" content="noindex"/>');
    await page.goto("/properties/does-not-exist-123");
    await expect(page.getByRole("heading", { name: "This property isn't available" })).toBeVisible();
  });

  test("design gallery is off unless explicitly enabled", async ({ page }) => {
    const res = await page.goto("/design");
    if (process.env.NEXT_PUBLIC_DESIGN_GALLERY === "1") {
      expect(res?.status()).toBe(200);
    } else {
      expect(res?.status()).toBe(404);
    }
  });
});

test.describe("design gallery screenshots", () => {
  test.skip(process.env.NEXT_PUBLIC_DESIGN_GALLERY !== "1", "gallery disabled");
  test("cards, rails and statuses", async ({ page }, info) => {
    await page.goto("/design");
    await expect(page.getByText("Design samples — not real listings")).toBeVisible();
    await expectNoHorizontalScroll(page);
    if (info.project.name === "pixel-7") {
      await page.screenshot({ path: `${shotDir}/21-listing-cards.png`, fullPage: true });
    }
  });
});
