import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { distanceKm, embedUrl, formatKm, filterProperties, formatArea, formatPrice, keyFacts, money, nextDays, parseFilters, paymentPlan, shortPrice, toQuery, viewingMessage, whatsappLink } from "../../site/js/data.js";
import { tourConfig } from "../../site/js/tour.js";
import { checkPortfolio } from "../../scripts/check-properties.mjs";

const site = fileURLToPath(new URL("../../site", import.meta.url));
const fixtures = fileURLToPath(new URL("../fixtures", import.meta.url));
const sample = JSON.parse(readFileSync(`${fixtures}/portfolio.json`, "utf8"));
const list = sample.properties.filter((p) => !p.coming_soon);

describe("the live properties file", () => {
  it("is valid and every file it names exists", () => {
    const data = JSON.parse(readFileSync(`${site}/data/properties.json`, "utf8"));
    expect(checkPortfolio(data, site)).toEqual([]);
  });
});

describe("checkPortfolio", () => {
  it("accepts the sample portfolio when its media is present", () => {
    const fx = structuredClone(sample);
    // The sample media lives in tests/fixtures/media rather than site/media/sample.
    const rewrite = (s) => s.replace("/media/sample/", "/media/");
    for (const p of fx.properties) {
      p.photos?.forEach((x) => (x.src = rewrite(x.src)));
      p.floorplans?.forEach((x) => (x.src = rewrite(x.src)));
      if (p.brochure) p.brochure.src = rewrite(p.brochure.src);
      p.tour?.scenes?.forEach((x) => (x.image = rewrite(x.image)));
    }
    expect(checkPortfolio(fx, fixtures)).toEqual([]);
  });

  it("explains each mistake in plain words", () => {
    const errors = checkPortfolio(
      {
        properties: [
          { slug: "Bad Slug", title: "", purpose: "buy", type: "castle", price: { amount: "lots" }, photos: [{ src: "/media/x/missing.jpg" }] },
          { slug: "dup", title: "A", purpose: "sale", type: "house", price: { on_request: true }, tour: { scenes: [{ id: "a", title: "A", image: "/media/a.jpg", hotspots: [{ to: "nowhere" }] }] } },
          { slug: "dup", title: "B", purpose: "sale", type: "house", price: { on_request: true }, location: { lat: 5.6 } },
        ],
      },
      site,
    ).join("\n");
    expect(errors).toMatch(/"slug" must be lower-case/);
    expect(errors).toMatch(/"title" is missing/);
    expect(errors).toMatch(/"purpose" must be one of/);
    expect(errors).toMatch(/"type" must be one of/);
    expect(errors).toMatch(/price.amount/);
    expect(errors).toMatch(/missing\.jpg is missing/);
    expect(errors).toMatch(/slug is used twice/);
    expect(errors).toMatch(/leads to "nowhere"/);
    expect(errors).toMatch(/lat" and "location.lng" must both/);
  });
});

describe("prices and facts", () => {
  it("formats prices, periods and on-request", () => {
    expect(formatPrice({ amount: 1250000, currency: "USD", period: "total" })).toBe("USD 1,250,000");
    expect(formatPrice({ amount: 3500, currency: "USD", period: "month" })).toBe("USD 3,500/month");
    expect(formatPrice({ on_request: true })).toBe("Price on request");
    expect(formatPrice(undefined)).toBe("Price on request");
    expect(shortPrice({ amount: 1250000, currency: "USD" })).toBe("USD 1.25M");
    expect(shortPrice({ amount: 3500, currency: "GHS", period: "month" })).toBe("GHS 3.5k/mo");
  });

  it("lists only the facts given, and no rooms on land", () => {
    expect(keyFacts(list[0]).map((f) => f[1])).toEqual(["5 Beds", "6 Baths", "3 Parking", "420 m²", "1 acre land"]);
    expect(keyFacts({ type: "land", bedrooms: 3, land: { value: 4, unit: "plot" } }).map((f) => f[1])).toEqual(["4 plots land"]);
    expect(formatArea({ value: 1, unit: "plot" })).toBe("1 plot");
  });
});

describe("filters", () => {
  const p = (q) => parseFilters(new URLSearchParams(q));

  it("reads only allowed values from the address bar", () => {
    expect(p("purpose=rent&type=apartment&min=100&max=x&sort=price_asc")).toEqual({ purpose: "rent", type: "apartment", min: 100, max: undefined, q: undefined, sort: "price_asc" });
    expect(p("purpose=steal&type=<script>")).toMatchObject({ purpose: undefined, type: undefined, sort: "newest" });
  });

  it("filters by purpose, type, area and price, and sorts", () => {
    expect(filterProperties(list, p("purpose=rent")).map((x) => x.slug)).toEqual(["sample-cantonments-apartment"]);
    expect(filterProperties(list, p("q=legon")).map((x) => x.slug)).toEqual(["sample-east-legon-villa"]);
    expect(filterProperties(list, p("max=5000")).map((x) => x.slug)).toEqual(["sample-cantonments-apartment"]);
    // Price on request goes last when sorting by price.
    expect(filterProperties(list, p("sort=price_asc")).map((x) => x.slug).at(-1)).toBe("sample-oyarifa-plots");
    expect(filterProperties(list, p("")).map((x) => x.slug)[0]).toBe("sample-east-legon-villa");
  });

  it("builds clean links", () => {
    expect(toQuery({ purpose: "sale", type: undefined, sort: "newest", view: "map" })).toBe("?purpose=sale&view=map");
    expect(toQuery({})).toBe("");
  });
});

describe("contact and tours", () => {
  it("writes a WhatsApp message naming the property", () => {
    const link = whatsappLink("+233 20 000 0000", list[0], "https://x.test/p");
    expect(link.startsWith("https://wa.me/233200000000?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toContain("Sample: East Legon Villa");
    expect(whatsappLink(null, list[0], "u")).toBeNull();
  });

  it("writes a viewing request and offers the next two weeks", () => {
    const text = viewingMessage(list[0], "https://x.test/p", { day: "Mon 2 Nov", time: "Morning (9am – 12pm)", name: "Ama", note: "" });
    expect(text).toBe('Hello, I\'d like to view "Sample: East Legon Villa" (https://x.test/p).\nDay: Mon 2 Nov\nTime: Morning (9am – 12pm)\nName: Ama');
    const days = nextDays(14, new Date(2026, 9, 31));
    expect(days).toHaveLength(14);
    expect(days[0].getDate()).toBe(1);
    expect(days[0].getMonth()).toBe(10);
  });

  it("measures straight-line distances", () => {
    // Central Accra (the map centre) to the airport: about 2.1 km in a straight line.
    expect(distanceKm([-0.187, 5.6037], [-0.1683, 5.6053])).toBeCloseTo(2.08, 1);
    expect(formatKm(0.42)).toBe("400 m");
    expect(formatKm(3.64)).toBe("3.6 km");
    expect(formatKm(23.4)).toBe("23 km");
  });

  it("splits a price into a deposit and equal monthly payments", () => {
    expect(paymentPlan(900000, 30, 12)).toEqual({ deposit: 270000, balance: 630000, monthly: 52500 });
    expect(money("USD", 52500)).toBe("USD 52,500");
  });

  it("embeds only known tour services", () => {
    expect(embedUrl("https://my.matterport.com/show/?m=abc")).toBe("https://my.matterport.com/show/?m=abc");
    expect(embedUrl("https://www.youtube.com/embed/x")).toBe("https://www.youtube-nocookie.com/embed/x");
    expect(embedUrl("https://evil.example.com/tour")).toBeNull();
    expect(embedUrl("javascript:alert(1)")).toBeNull();
  });

  it("joins rooms with hotspots and drops hotspots to rooms that don't exist", () => {
    const cfg = tourConfig({
      scenes: [
        { id: "a", title: "Hall", image: "/a.jpg", hotspots: [{ to: "b", yaw: 90 }, { to: "zzz" }] },
        { id: "b", title: "Kitchen", image: "/b.jpg" },
      ],
    });
    expect(cfg.default.firstScene).toBe("a");
    expect(cfg.scenes.a.hotSpots).toEqual([{ type: "scene", sceneId: "b", yaw: 90, pitch: -10, text: "Kitchen", cssClass: "tour-spot" }]);
    expect(cfg.scenes.b.panorama).toBe("/b.jpg");
  });
});
