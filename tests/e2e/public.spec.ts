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
  // Map tiles are not needed in tests: a one-layer street style stands in, and imagery and fonts are empty.
  await page.route("https://tiles.openfreemap.org/**", (r) =>
    r.request().url().includes("/styles/")
      ? r.fulfill({ json: { version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#eeeeee" } }] } })
      : r.fulfill({ status: 204 }),
  );
  await page.route("https://server.arcgisonline.com/**", (r) => r.fulfill({ contentType: "image/jpeg", body: readFileSync(`${FX}/media/tile.jpg`) }));
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
    await page.locator("#menu").getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test("security headers are set and the map's workers are allowed", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("script-src 'self'");
    expect(h["content-security-policy"]).toContain("worker-src 'self' blob:");
    expect(h["content-security-policy"]).toContain("https://ecikayrsbjzgdjkehnhl.supabase.co");
    expect(h["content-security-policy"]).toContain("https://server.arcgisonline.com");
    expect(h["x-frame-options"]).toBe("DENY");
  });

  test("old addresses go to the homepage", async ({ page }) => {
    for (const path of ["/properties", "/saved", "/portal/acme/listings", "/explore"]) {
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
    await expect(villa.locator(".card__price")).toContainText("USD 1,250,000");
    await expect(villa.locator(".card__facts")).toContainText("5 Beds");
    await expect(villa.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me/);
    await expect(page.locator("#results .card", { hasText: "Oyarifa" }).locator(".card__price")).toContainText("Price on request");
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

test("the map page opens on Hybrid, clusters nearby properties and filters", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map");
  await expect(page.locator("#map canvas")).toBeAttached({ timeout: 20_000 });
  await expect(page.locator("[data-look=hybrid]")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#count")).toContainText("4 properties");
  await expect(page.locator("#chips")).toHaveCount(0);
  await page.locator("[data-open-filters]").locator("visible=true").first().click();
  await page.locator("#mfilters label", { hasText: "For rent" }).click();
  await page.getByRole("button", { name: "Show results" }).click();
  await expect(page.locator("#count")).toContainText("1 property match");
  await page.locator("[data-tool=layers]").click();
  await page.locator("[data-look=map]").click();
  await expect(page.locator("[data-look=map]")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#from")).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});

test("filters narrow the map by bedrooms and price", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map");
  await page.locator("[data-open-filters]").locator("visible=true").first().click();
  await page.locator("#mfilters label", { hasText: "5+" }).first().click();
  await page.getByRole("button", { name: "Show results" }).click();
  await expect(page.locator("#count")).toContainText("1 property match");
  await page.locator("[data-open-filters]").locator("visible=true").first().click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("#count")).toContainText("4 properties");
});

test("on phones, the list is one tap away and a pick shows Get directions", async ({ page }, info) => {
  test.skip(info.project.name === "desktop");
  await useSamplePortfolio(page);
  await page.goto("/map");
  await page.getByRole("button", { name: "List" }).click();
  await expect(page.locator("#list .mrow").first()).toBeVisible();
  await page.locator("#list .mrow", { hasText: "Sample: East Legon Villa" }).click();
  await expect(page.locator(".mpreview")).toBeVisible();
  await expect(page.locator(".mpreview").getByRole("button", { name: "Get directions" })).toBeVisible();
});

test("the map page has the list and a preview card on desktop @desktop", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map");
  await expect(page.locator("#list .mrow")).toHaveCount(4);
  await page.locator("#list .mrow", { hasText: "Sample: East Legon Villa" }).click();
  await expect(page.locator(".mpreview")).toBeVisible();
  await expect(page.locator(".mpreview")).toContainText("Sample: East Legon Villa");
  await expect(page.locator(".mpreview").getByRole("button", { name: "Get directions" })).toBeVisible();
});

test("the map opens on a linked property @desktop", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map?p=sample-cantonments-apartment");
  await expect(page.locator(".mpreview")).toContainText("Sample: Cantonments Apartment");
});

test("a property page links to its place on the map", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/properties/sample-east-legon-villa");
  await expect(page.getByRole("link", { name: "Open on the map" })).toHaveAttribute("href", "/map?p=sample-east-legon-villa");
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

  test("cards, property, the office and map show how far the visitor is", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await expect(page.locator(".card__away").first()).toContainText("away");
    await page.goto("/properties/sample-east-legon-villa");
    await expect(page.locator("#pd-away")).toContainText("away, in a straight line");
    await page.goto("/map");
    await expect(page.locator(".landmark--me")).toHaveCount(1);
    await expect(page.locator("#list .mrow__away").first()).toContainText("from you");
  });
});

test("the map never asks for location by itself", async ({ page, context }) => {
  await context.clearPermissions();
  await useSamplePortfolio(page);
  await page.goto("/map");
  await expect(page.locator("#map canvas")).toBeAttached({ timeout: 20_000 });
  await expect(page.locator(".landmark--me")).toHaveCount(0);
  await expect(page.locator("#list .mrow__away")).toHaveCount(0);
});

test.describe("search and save", () => {
  test("the search suggests areas and properties, and filters the list", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.locator("#q").fill("legon");
    await expect(page.locator("#suggest")).toContainText("East Legon");
    await page.locator("#q").press("Enter");
    await expect(page.locator("#results .card")).toHaveCount(1);
    await expect(page).toHaveURL(/\?q=legon/);
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.locator("#results .card")).toHaveCount(5);
  });

  test("filters narrow by bedrooms", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Filters" }).click();
    await page.locator("#filters label", { hasText: "5+" }).click();
    await page.getByRole("button", { name: "Show results" }).click();
    await expect(page.locator("#results .card")).toHaveCount(1);
    await expect(page).toHaveURL(/beds=5/);
  });

  test("saved properties appear under Saved", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Save Sample: East Legon Villa" }).click();
    await expect(page.getByRole("button", { name: "Save Sample: East Legon Villa" })).toHaveAttribute("aria-pressed", "true");
    await page.locator("[data-cat=saved]").click();
    await expect(page.locator("#results .card")).toHaveCount(1);
    await page.goto("/profile");
    await expect(page.locator(".mine")).toHaveCount(0);
  });

});

test("a property shows icons only for the amenities it lists", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/properties/sample-east-legon-villa");
  const grid = page.locator("#amenities .amen");
  await expect(grid.locator("li").first()).toBeVisible();
  await expect(grid).not.toContainText("Gymnasium");
});

test("agents and developers lists people on the platform, with no join card", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/agents");
  await expect(page.locator(".pc").first()).toContainText("Propertiq");
  await expect(page.locator("#office")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Agents & companies");
  await expect(page.locator(".pc--join")).toHaveCount(0);
  await expect(page.locator("#kinds")).toContainText("Home owners");
  await expect(page.locator("#kinds")).not.toContainText("Estates");
  await page.locator("[data-kind=agent]").click();
  await expect(page.locator("#dir")).toContainText("No one in this group yet.");
});

// Supabase Auth, faked: a code is "sent", "123456" is right, and the session belongs to a new number.
const SB = "https://ecikayrsbjzgdjkehnhl.supabase.co/auth/v1";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
function fakeAuth(page: Page, meta: Record<string, string> = {}) {
  const user = (m: object) => ({ id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", phone: "233241234567", email: "", user_metadata: m, app_metadata: {}, created_at: "2026-10-31T00:00:00Z" });
  const session = (m: object) => ({ access_token: `${b64({ alg: "HS256" })}.${b64({ sub: user(m).id, exp: 4102444800, role: "authenticated" })}.x`, token_type: "bearer", expires_in: 3600, expires_at: 4102444800, refresh_token: "r", user: user(m) });
  let current: Record<string, string> = meta;
  const sent: string[] = [];
  page.route(`${SB}/**`, async (r) => {
    const url = r.request().url();
    const body = r.request().postDataJSON?.() ?? {};
    sent.push(url.replace(SB, ""));
    if (url.includes("/otp")) return r.fulfill({ json: {} });
    if (url.includes("/verify")) return body.token === "123456" ? r.fulfill({ json: session(current) }) : r.fulfill({ status: 403, json: { code: "otp_expired", message: "Token has expired or is invalid" } });
    if (url.includes("/token?grant_type=password")) return body.password === "correct-horse" ? r.fulfill({ json: session({ role: "agent", name: "Sample Agent" }) }) : r.fulfill({ status: 400, json: { code: "invalid_credentials", message: "Invalid login credentials" } });
    if (url.endsWith("/user") && r.request().method() === "PUT") {
      current = { ...current, ...(body.data ?? {}) };
      return r.fulfill({ json: { ...user(current), new_email: body.email } });
    }
    if (url.includes("/logout")) return r.fulfill({ status: 204 });
    return r.fulfill({ json: user(current) });
  });
  return sent;
}

test("profile offers only sign up and sign in", async ({ page }) => {
  await useSamplePortfolio(page);
  fakeAuth(page);
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/sign-up");
  await expect(page.locator(".acc__roles a")).toHaveCount(4);
  await page.locator(".acc__roles a", { hasText: "Company" }).click();
  await expect(page.getByRole("heading", { name: "Who are you?" })).toBeVisible();
  await expect(page.locator(".r4__opt input[value=company]")).toBeChecked();
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
});

test("sign up: role, phone, SMS code, then name, email and password", async ({ page }) => {
  await useSamplePortfolio(page);
  const sent = fakeAuth(page);
  await page.goto("/sign-up");
  await expect(page.locator(".r4__opt")).toHaveCount(4);
  await page.locator(".r4__opt", { hasText: "Developer" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your phone number" })).toBeVisible();
  await page.getByLabel("Phone number").fill("024 123 4567");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Enter the code" })).toBeVisible();
  await expect(page.locator("main")).toContainText("+233 24 123 4567");
  await page.getByLabel("6-digit code").fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("alert")).toContainText("wrong or has expired");
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await page.getByLabel("Company name").fill("Sample Builders");
  await page.getByLabel("Email").fill("hello@example.com");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sample Builders");
  await expect(page.locator(".acct")).toContainText("Developer");
  expect(sent.some((u) => u.startsWith("/otp"))).toBe(true);
});

test("sign in with phone and password", async ({ page }) => {
  await useSamplePortfolio(page);
  fakeAuth(page);
  await page.goto("/sign-in");
  await page.getByLabel("Phone number").fill("0241234567");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("don't match");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sample Agent");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
});

test.describe("directions", () => {
  test.use({ geolocation: { latitude: 5.6037, longitude: -0.187 }, permissions: ["geolocation"] });

  test("draw the route with time, distance and turns", async ({ page }) => {
    await useSamplePortfolio(page);
    await page.route("**/api/route?**", (r) =>
      r.fulfill({
        json: {
          mode: "drive",
          distance: 4200,
          duration: 660,
          geometry: { type: "LineString", coordinates: [[-0.187, 5.6037], [-0.15, 5.63]] },
          steps: [{ text: "Head out on Sample Road", distance: 4200 }, { text: "Arrive at the property area", distance: 0 }],
        },
      }),
    );
    await page.goto("/map?p=sample-east-legon-villa&directions=1");
    await expect(page.locator("#route")).toContainText("11 min");
    await expect(page.locator("#route")).toContainText("4.2 km by road");
    await expect(page.locator("#route")).toContainText("Head out on Sample Road");
    await expect(page.locator("#route").getByRole("link", { name: "Google Maps" })).toHaveAttribute("href", /destination=/);
    await page.getByRole("button", { name: "Close directions" }).click();
    await expect(page.locator("#route")).toBeHidden();
  });
});

test("the bottom bar has four tabs, and old pages redirect", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/");
  await expect(page.locator(".tabbar li")).toHaveCount(4);
  await expect(page.locator(".tabbar")).toContainText("Profile");
  await expect(page.locator(".tabbar")).not.toContainText("Contact");
  await page.goto("/contact");
  await expect(page).toHaveURL(/\/agents$/);
  await page.goto("/compare");
  await expect(page).toHaveURL(/\/$/);
});

test("a sample listing is labelled and can't be contacted", async ({ page }) => {
  await useSamplePortfolio(page, JSON.stringify({ owner: { name: "Owner", phone: "+233200000000", whatsapp: "+233200000000" }, properties: [{ slug: "sample-x", title: "Sample: X", sample: true, purpose: "sale", type: "house", price: { amount: 1, currency: "USD" }, location: { area: "Osu", city: "Accra" } }] }));
  await page.goto("/");
  await expect(page.locator(".card__tag")).toHaveText("Sample");
  await expect(page.locator(".card").getByRole("link", { name: "WhatsApp" })).toHaveCount(0);
  await page.goto("/properties/sample-x");
  await expect(page.locator(".sample-note").first()).toContainText("isn't a real property");
  await expect(page.getByRole("button", { name: "Book a Viewing" })).toHaveCount(0);
});

test("if satellite imagery fails, the map falls back to the street map", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.route("https://server.arcgisonline.com/**", (r) => r.fulfill({ status: 503 }));
  await page.goto("/map");
  await expect(page.locator("[data-look=map]")).toHaveAttribute("aria-pressed", "true", { timeout: 20_000 });
  await expect(page.locator(".toast")).toContainText("street map");
});

test("Get directions with nothing picked asks which property", async ({ page }) => {
  await useSamplePortfolio(page);
  await page.goto("/map");
  await page.locator("#go").click();
  await expect(page.locator("#mpick")).toContainText("Directions to");
  await expect(page.locator("#mpick [data-pick]")).toHaveCount(4);
});

