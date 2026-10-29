import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const shotDir = "docs/screenshots/static/e2e";
const FX = "tests/fixtures";

// Phones widen the whole layout when something is too wide, so check the layout width matches the screen too.
async function expectNoHorizontalScroll(page: Page) {
  const { overflow, layout } = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth, layout: window.innerWidth }));
  expect(overflow).toBeLessThanOrEqual(0);
  expect(layout).toBe(page.viewportSize()!.width);
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
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Properties");
    await expect(page.locator("#results .card")).toHaveCount(5);
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

  test("filter by category", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: /For rent/ }).click();
    await expect(page).toHaveURL(/cat=rent/);
    await expect(page.locator("#results .card")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: /For rent/ })).toHaveAttribute("aria-current", "page");
  });

  test("an empty portfolio says new properties are being prepared", async ({ page }) => {
    await useSamplePortfolio(page, JSON.stringify({ owner: {}, properties: [] }));
    await page.goto("/");
    await expect(page.getByText("New properties are being prepared.")).toBeVisible();
  });

  test("lists coming-soon properties with a drawn thumbnail", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/?cat=soon");
    await expect(page.locator("#results .card--soon")).toHaveCount(1);
    await expect(page.locator(".card--soon .art__mark")).toHaveText("S");
    await page.locator(".card--soon .card__media").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sample: Coming Court");
    await expect(page.getByText("Photos, prices and floor plans are being prepared.")).toBeVisible();
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
    await expect(page.locator(".pd-tabs")).toContainText("Payment plan");
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

  test("book a viewing writes the request with the day, time and name", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/properties/sample-east-legon-villa");
    await page.getByRole("button", { name: "Book a Viewing" }).locator("visible=true").first().click();
    const sheet = page.getByRole("dialog", { name: "Book a viewing" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: "Send on WhatsApp" }).click();
    await expect(sheet.getByRole("alert")).toHaveText("Pick a day for the viewing.");
    await sheet.locator(".day").nth(1).click();
    await sheet.locator(".slot").first().click();
    await sheet.getByLabel("Your name").fill("Sample Visitor");
    await expect(sheet.getByRole("alert")).toBeHidden();
    const wa = decodeURIComponent((await sheet.getByRole("link", { name: "Send on WhatsApp" }).getAttribute("href"))!);
    expect(wa).toContain('view "Sample: East Legon Villa"');
    expect(wa).toContain("Time: Morning");
    expect(wa).toContain("Name: Sample Visitor");
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
  });

  test("the payment planner updates as the sliders move", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/properties/sample-east-legon-villa");
    await expect(page.locator("#pl-monthly")).toHaveText("USD 72,917");
    await page.locator("#pl-dep").fill("50");
    await expect(page.locator("#pl-deposit")).toHaveText("USD 625,000");
    await expect(page.locator("#pl-monthly")).toHaveText("USD 52,083");
    expect(decodeURIComponent((await page.locator("#pl-ask").getAttribute("href"))!)).toContain("50% deposit");
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

test("the map page lists every placed property and shows price tags", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map");
  await expect(page.locator("#carousel li")).toHaveCount(4);
  await expect(page.locator("#map canvas")).toBeAttached({ timeout: 20_000 });
  await expect(page.locator(".tagpin")).toHaveCount(4);
  await page.locator("#chips").getByRole("button", { name: "Rent" }).click();
  await expect(page.locator("#carousel li")).toHaveCount(1);
  await expectNoHorizontalScroll(page);
});

test("the map page has the list and a preview card on desktop @desktop", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map");
  await expect(page.locator("#list .mrow")).toHaveCount(4);
  await page.locator("#list .mrow", { hasText: "Sample: East Legon Villa" }).click();
  await expect(page.locator(".mpreview")).toBeVisible();
  await expect(page.locator(".mpreview")).toContainText("Sample: East Legon Villa");
});

test("the map measures distances and opens on a linked property @desktop", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map?p=sample-cantonments-apartment");
  await expect(page.locator(".mpreview")).toContainText("Sample: Cantonments Apartment");
  await expect(page.locator(".mpreview")).toContainText("from the airport");
  await expect(page.locator("#list .mrow__away").first()).toContainText("from the airport");
  await page.locator("#from").selectOption("office");
  await expect(page.locator(".mpreview")).toContainText("from our office");
});

test("a property page links to its place on the map", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/properties/sample-east-legon-villa");
  await expect(page.getByRole("link", { name: "Open on the map" })).toHaveAttribute("href", "/map?p=sample-east-legon-villa");
});

test("contact shows only the details that are filled in", async ({ page }) => {
  await useSamplePortfolio(page, JSON.stringify({ owner: { about: "x", email: "owner@example.com" }, properties: [] }));
  await page.goto("/contact");
  await expect(page.locator(".ways .way")).toHaveCount(1);
  await expect(page.locator(".ways")).toContainText("owner@example.com");
  await expect(page.locator("main")).not.toContainText("Resilience");
});

test("desktop shows the main navigation in the header @desktop", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/");
  await expect(page.locator(".site-nav")).toBeVisible();
  await expect(page.locator(".tabbar")).toBeHidden();
  await expect(page.locator(".site-footer")).toHaveCount(0);
});

test("manifest, icons and the social image are served", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect((await request.get("/og.jpg")).headers()["content-type"]).toContain("image/jpeg");
});

test.describe("distances from the visitor", () => {
  test.use({ geolocation: { latitude: 5.6037, longitude: -0.187 }, permissions: ["geolocation"] });

  test("cards, property, contact and map show how far the visitor is", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await expect(page.locator(".card__away").first()).toContainText("away");
    await page.goto("/properties/sample-east-legon-villa");
    await expect(page.locator("#pd-away")).toContainText("away, in a straight line");
    await page.goto("/contact");
    await expect(page.locator("#office-away")).toContainText("from the office");
    await page.goto("/map");
    await expect(page.locator("#from")).toHaveValue("me");
    await expect(page.locator(".landmark--me")).toHaveCount(1);
  });
});

test("the map falls back to the airport when location isn't shared", async ({ page, context }) => {
  await context.clearPermissions();
  await useSamplePortfolio(page);
  await page.goto("/map");
  await expect(page.locator("#from-note")).toContainText("Distances are from the airport", { timeout: 15_000 });
  await expect(page.locator("#from")).toHaveValue("airport");
});
