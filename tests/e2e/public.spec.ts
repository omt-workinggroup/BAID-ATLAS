import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "docs/screenshots/static/e2e";
const FX = "tests/fixtures";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
async function shot(page: Page, name: string, project: string) {
  if (project === "pixel-7") await page.screenshot({ path: `${shotDir}/${name}.png` });
}

// Every test runs against the labelled sample portfolio in tests/fixtures, not the live file.
async function useSamplePortfolio(page: Page, body?: string) {
  await page.route("**/data/properties.json", (r) => r.fulfill({ contentType: "application/json", body: body ?? readFileSync(`${FX}/portfolio.json`) }));
  await page.route("**/media/sample/**", (r) => {
    const f = new URL(r.request().url()).pathname.split("/").pop()!;
    r.fulfill({ contentType: f.endsWith(".pdf") ? "application/pdf" : "image/jpeg", body: readFileSync(`${FX}/media/${f}`) });
  });
  // Map tiles are not needed in tests.
  await page.route("https://api.maptiler.com/**", (r) => r.fulfill({ status: 204 }));
}

test.describe("site", () => {
  test("the homepage lists every property", async ({ page }, info) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, includeHidden: true })).toContainText("Browse Homes, Apartments");
    await expect(page.locator("#results .card")).toHaveCount(4);
    await expect(page.locator("#results .card").first()).toContainText("Sample: East Legon Villa");
    await expectNoHorizontalScroll(page);
    await shot(page, "01-home", info.project.name);
  });

  test("the menu opens and closes on phones", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator("#menu")).toBeVisible();
    await page.locator("#menu").getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("security headers are set and the map's workers are allowed", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("script-src 'self'");
    expect(h["content-security-policy"]).toContain("worker-src 'self' blob:");
    expect(h["content-security-policy"]).not.toContain("supabase");
    expect(h["x-frame-options"]).toBe("DENY");
  });

  test("old addresses go to the homepage", async ({ page }) => {
    for (const path of ["/properties", "/saved", "/sign-in", "/portal/acme/listings", "/explore"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/localhost:\d+\/(\?.*)?$/);
    }
  });
});

for (const width of [320, 375, 414, 768, 1024, 1440]) {
  test(`homepage and a property fit ${width}px without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await useSamplePortfolio(page);
    await page.goto("/");
    await expect(page.locator(".card").first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto("/properties/sample-east-legon-villa");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test.describe("listings", () => {
  test("show the price, facts and status", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    const villa = page.locator("#results .card", { hasText: "Sample: East Legon Villa" });
    await expect(villa.locator(".card__media")).toHaveAttribute("aria-label", /USD 1,250,000/);
    await expect(villa.locator(".card__overlay")).toContainText("5 Beds");
    await expect(page.locator("#results .card", { hasText: "Oyarifa" }).locator(".card__media")).toHaveAttribute("aria-label", /Price on request/);
    await expect(page.locator("#results .card", { hasText: "Airport" }).locator(".card__tag")).toHaveText("Under offer");
  });

  test("filter and search", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Filter properties" }).getByRole("link", { name: "For rent" }).click();
    await expect(page).toHaveURL(/purpose=rent/);
    await expect(page.locator("#results .card")).toHaveCount(1);
    await page.goto("/");
    await page.getByPlaceholder("Search your home.").fill("oyarifa");
    await page.getByPlaceholder("Search your home.").press("Enter");
    await expect(page.locator("#results .card")).toHaveCount(1);
    await expect(page.locator("#results .card")).toContainText("Oyarifa");
  });

  test("an empty portfolio says new properties are being prepared", async ({ page }) => {
    await useSamplePortfolio(page, JSON.stringify({ owner: {}, properties: [] }));
    await page.goto("/");
    await expect(page.getByText("New properties are being prepared.")).toBeVisible();
  });

  test("the locations map loads and lists every placed property", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.locator("#locations").scrollIntoViewIfNeeded();
    await expect(page.locator("#places li")).toHaveCount(4);
    await expect(page.locator("#map canvas")).toBeAttached({ timeout: 20_000 });
    await expect(page.locator(".pin")).toHaveCount(4);
  });
});

test.describe("property page", () => {
  test("shows price, facts, gallery, floor plans, brochure and contact", async ({ page }, info) => {
    await useSamplePortfolio(page);
    await page.goto("/properties/sample-east-legon-villa");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sample: East Legon Villa");
    await expect(page).toHaveTitle("Sample: East Legon Villa · Propertiq");
    await expect(page.locator(".pd-top__price strong")).toHaveText("USD 1,250,000");
    await expect(page.locator(".stats")).toContainText("Beds");
    await expect(page.locator("#brochure").getByRole("link", { name: "Open" })).toHaveAttribute("href", "/media/sample/brochure.pdf");
    const wa = await page.getByRole("link", { name: "Schedule Visit" }).first().getAttribute("href");
    expect(decodeURIComponent(wa!)).toContain("Sample: East Legon Villa");
    await expectNoHorizontalScroll(page);
    await shot(page, "03-property", info.project.name);

    // Images open full screen and step with the arrow keys.
    await page.locator(".photos button").first().click();
    await expect(page.locator("#viewer")).toBeVisible();
    await expect(page.locator("#viewer-count")).toHaveText("1 / 6");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#viewer-count")).toHaveText("2 / 6");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Enlarge: Ground floor/ }).click();
    await expect(page.locator("#viewer-caption")).toHaveText("Ground floor");
  });

  test("the 3D tour loads, and moves between rooms", async ({ page }, info) => {
    await useSamplePortfolio(page);
    await page.goto("/properties/sample-east-legon-villa#tour");
    await expect(page.locator("#tour-view canvas")).toBeVisible();
    await expect(page.locator(".tour-spot")).toHaveCount(1);
    await page.getByRole("group", { name: "Rooms" }).getByRole("button", { name: "Kitchen" }).click();
    await expect(page.getByRole("group", { name: "Rooms" }).getByRole("button", { name: "Kitchen" })).toHaveAttribute("aria-current", "true");
    await shot(page, "04-tour", info.project.name);
  });

  test("an unknown property explains it is no longer listed", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/properties/not-a-real-one");
    await expect(page.getByRole("heading", { name: "This property isn't listed any more." })).toBeVisible();
  });
});

test("contact shows only the details that are filled in", async ({ page }) => {
  await useSamplePortfolio(page, JSON.stringify({ owner: { about: "x", email: "owner@example.com" }, properties: [] }));
  await page.goto("/contact");
  await expect(page.locator(".contact__list > div")).toHaveCount(1);
  await expect(page.locator(".contact__list")).toContainText("owner@example.com");
});

test("desktop shows the main navigation in the header @desktop", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/");
  await expect(page.locator(".site-nav")).toBeVisible();
  await expect(page.locator(".tabbar")).toBeHidden();
  await expect(page.locator(".perks")).toBeVisible();
});

test("manifest, icons and the social image are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect((await request.get("/og.jpg")).headers()["content-type"]).toContain("image/jpeg");
});
