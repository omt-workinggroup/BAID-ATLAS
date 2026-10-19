import { expect, test, type Page } from "@playwright/test";

const shotDir = "docs/screenshots/static/e2e";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // Content can also be clipped without page scroll; key elements must sit inside the viewport.
  const width = page.viewportSize()!.width;
  for (const el of await page.locator("main h1, main form").all()) {
    const box = await el.boundingBox();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  }
}

async function shot(page: Page, name: string, project: string) {
  if (project === "pixel-7") await page.screenshot({ path: `${shotDir}/${name}.png` });
}

test.describe("public pages", () => {
  test("landing page is a standalone splash without navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find Your Next Property");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await page.getByRole("link", { name: "Get Started" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("home renders with mobile navigation", async ({ page }, info) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your next property");
    await expect(page.getByPlaceholder("Search your home, area or PQ-…")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" }).last()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "01-home", info.project.name);
  });

  for (const width of [360, 390, 430]) {
    test(`home fits ${width}px without horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/home");
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

  test("sign-in page requires a phone number", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Continue with Google")).toHaveCount(0);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText("Enter your phone number.")).toBeVisible();
  });

  test("code page without a pending number goes back to sign-in", async ({ page }) => {
    await page.goto("/verify-phone");
    await expect(page).toHaveURL(/\/sign-in\?error=expired/);
    await expect(page.getByText("That code request has expired.")).toBeVisible();
  });

  test("old email sign-in links land on sign-in with an explanation", async ({ page }) => {
    await page.goto("/auth/callback?code=old&next=/account");
    await expect(page).toHaveURL(/\/sign-in\?error=link/);
    await expect(page.getByText("That link is invalid or has expired. Please sign in again.")).toBeVisible();
  });

  test("unknown pages return 404", async ({ page }) => {
    for (const path of ["/reset-password", "/verify-email", "/design"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
    }
  });
});

test.describe("access control", () => {
  for (const path of ["/account", "/saved", "/inbox", "/onboarding", "/portal", "/portal/new", "/portal/some-org/team", "/portal/some-org/listings/new", "/portal/some-org/leads", "/ops", "/ops/reports", "/invitations/accept?token=x"]) {
    test(`anonymous visit to ${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in\?next=/);
      expect(new URL(page.url()).searchParams.get("next")).toBe(path);
    });
  }

  test("open redirects are neutralised", async ({ page }) => {
    for (const url of ["/sign-in?next=https%3A%2F%2Fevil.example%2F", "/sign-in?next=%2F%2Fevil.example"]) {
      await page.goto(url);
      await expect(page.locator('input[name="next"]')).toHaveValue("/account");
    }
  });

  test("security headers are set", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("script-src 'self'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
  });
});

test("trust and verification page explains the limits of each check", async ({ page }) => {
  await page.goto("/trust-and-verification");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What Propertiq checks, and what it doesn't.");
  await expect(page.getByText("A document review is not a title certification.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment never buys a check." })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("compare page explains how to start when nothing is selected", async ({ page }) => {
  await page.goto("/compare");
  await expect(page.getByRole("heading", { name: "Nothing to compare yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore property" })).toHaveAttribute("href", "/explore");
});

test("explore shows filters as a sidebar on wide screens @desktop", async ({ page }) => {
  await page.goto("/explore?purpose=sale&beds=3");
  await expect(page.locator("#filters")).toBeVisible();
  await expect(page.locator("#open-filters")).toBeHidden();
  await expect(page.getByRole("link", { name: "Remove filter: 3+ bedrooms" })).toHaveAttribute("href", "/explore?purpose=sale");
});

test("explore offers a map view that keeps the filters", async ({ page }) => {
  await page.goto("/explore?purpose=sale");
  const toMap = page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "Map" });
  const href = new URL((await toMap.getAttribute("href"))!, "http://x");
  expect(Object.fromEntries(href.searchParams)).toEqual({ purpose: "sale", view: "map" });
  await toMap.click();
  await expect(page.getByRole("heading", { name: "Explore Properties" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Buy or rent" }).getByRole("link", { name: "Buy" })).toHaveAttribute("aria-current", "page");
  const toList = new URL((await page.getByRole("link", { name: "Show as a list" }).getAttribute("href"))!, "http://x");
  expect(Object.fromEntries(toList.searchParams)).toEqual({ purpose: "sale" });
  await expectNoHorizontalScroll(page);
});

test.describe("PWA and sharing", () => {
  test("manifest and icons are served", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.display).toBe("standalone");
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
    expect((await request.get("/offline.html")).status()).toBe(200);
  });

  test("open graph image is served", async ({ page, request }) => {
    await page.goto("/");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const res = await request.get(new URL(og!).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });
});

test("desktop layout shows top navigation @desktop", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
  await page.screenshot({ path: `${shotDir}/10-home-desktop.png` });
});

test.describe("discovery", () => {
  test("home search submits to Explore", async ({ page }) => {
    await page.goto("/home");
    await page.getByPlaceholder("Search your home, area or PQ-…").fill("Kumasi");
    await page.getByPlaceholder("Search your home, area or PQ-…").press("Enter");
    await expect(page).toHaveURL(/\/explore\?q=Kumasi/);
    await expect(page.locator("#q")).toHaveValue("Kumasi");
  });

  test("explore renders with a filter sheet", async ({ page }, info) => {
    await page.goto("/explore?purpose=long_term_rent");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("For rent");
    await page.getByRole("button", { name: /^Filters/ }).click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Prices are matched in the listing's own currency")).toBeVisible();
    await page.waitForTimeout(400);
    await shot(page, "20-explore-filters", info.project.name);
    await dialog.locator("#f-beds").getByText("3+").click();
    await dialog.locator("#f-baths").getByText("2+").click();
    await dialog.getByText("Availability confirmed in the last 30 days").click();
    await dialog.getByRole("button", { name: "Show results" }).click();
    await expect(page).toHaveURL(/beds=3/);
    await expect(page).toHaveURL(/baths=2/);
    await expect(page).toHaveURL(/fresh=1/);
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
});
