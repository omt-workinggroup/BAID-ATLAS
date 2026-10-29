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
  test("the homepage is the listings, with no splash", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every property, in full.");
    await expect(page.locator(".pcard").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" })).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  test("security headers are set and there is no backend in the policy", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("script-src 'self'");
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
    await expect(page.locator(".pcard").first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto("/properties/sample-east-legon-villa");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test.describe("properties", () => {
  test("lists every property with its price and what it offers", async ({ page }, info) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await expect(page.getByText("4 developments")).toBeVisible();
    // With no filters, the first property is the large featured card.
    await expect(page.locator(".pcard--feature")).toContainText("Sample: East Legon Villa");
    const villa = page.locator(".pcard", { hasText: "Sample: East Legon Villa" });
    await expect(villa).toContainText("USD 1,250,000");
    await expect(villa.locator(".pcard__offers")).toHaveText(/3D tour.*Floor plan.*Brochure/);
    await expect(page.locator(".pcard", { hasText: "Oyarifa" })).toContainText("Price on request");
    await expect(page.locator(".pcard", { hasText: "Airport" })).toContainText("Under offer");
    // A tour link from an unknown site is ignored, so it is not advertised.
    await expect(page.locator(".pcard", { hasText: "Airport" }).locator(".pcard__offers")).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await shot(page, "01-properties", info.project.name);
  });

  test("filters and searches", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Filter" }).getByRole("link", { name: "For rent" }).click();
    await expect(page).toHaveURL(/purpose=rent/);
    await expect(page.locator(".pcard")).toHaveCount(1);
    await page.goto("/");
    await page.getByPlaceholder("Search an area or a development").fill("oyarifa");
    await page.getByPlaceholder("Search an area or a development").press("Enter");
    await expect(page.locator(".pcard")).toHaveCount(1);
    await expect(page.locator(".pcard")).toContainText("Oyarifa");
  });

  test("an empty portfolio says new properties are coming", async ({ page }) => {
    await useSamplePortfolio(page, JSON.stringify({ owner: {}, properties: [] }));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "New properties are on their way" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Filter" })).toBeHidden();
  });

  test("the map view shows a preview card for a property", async ({ page }, info) => {
    await useSamplePortfolio(page);
    await page.goto("/?view=map");
    await expect(page.getByRole("heading", { name: "Explore Properties" })).toBeVisible();
    await expect(page.locator(".mcard")).toContainText("Sample: East Legon Villa");
    await expectNoHorizontalScroll(page);
    await shot(page, "02-map", info.project.name);
  });
});

test.describe("property page", () => {
  test("shows price, facts, photos, floor plans, brochure and contact", async ({ page }, info) => {
    await useSamplePortfolio(page);
    await page.goto("/properties/sample-east-legon-villa");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sample: East Legon Villa");
    await expect(page).toHaveTitle("Sample: East Legon Villa · Propertiq");
    await expect(page.locator(".pd-hero__price")).toHaveText("USD 1,250,000");
    await expect(page.locator(".facts")).toContainText("5 Beds");
    await expect(page.getByRole("link", { name: "View the brochure" })).toHaveAttribute("href", "/media/sample/brochure.pdf");
    const wa = await page.locator(".action-bar a", { hasText: "WhatsApp" }).getAttribute("href");
    expect(decodeURIComponent(wa!)).toContain("Sample: East Legon Villa");
    await expectNoHorizontalScroll(page);
    await shot(page, "03-property", info.project.name);

    // Photos open full screen and step with the arrow keys.
    await page.locator(".mosaic button").first().click();
    await expect(page.locator("#viewer")).toBeVisible();
    await expect(page.locator("#viewer-count")).toHaveText("1 / 6");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#viewer-count")).toHaveText("2 / 6");
    await page.keyboard.press("Escape");
    // Floor plans too.
    await page.getByRole("button", { name: /Ground floor/ }).click();
    await expect(page.locator("#viewer-caption")).toHaveText("Ground floor");
  });

  test("the 3D tour loads, and moves between rooms", async ({ page }, info) => {
    await useSamplePortfolio(page);
    await page.goto("/properties/sample-east-legon-villa");
    await page.getByRole("link", { name: "Take the 3D tour" }).click();
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
  await expect(page.locator(".contact-way")).toHaveCount(1);
  await expect(page.locator(".contact-way")).toContainText("owner@example.com");
});

test("desktop property page has the contact panel beside the details @desktop", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/properties/sample-east-legon-villa");
  await expect(page.locator(".enquire")).toBeVisible();
  await expect(page.locator(".action-bar")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
});

test("manifest, icons and the social image are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect((await request.get("/og.jpg")).headers()["content-type"]).toContain("image/jpeg");
});
