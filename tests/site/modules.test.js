// Unit tests for the static site's shared modules (site/js). They run in Node with a stub Supabase client.
import { beforeAll, describe, expect, it } from "vitest";

let core, listings, format, validate;
beforeAll(async () => {
  globalThis.window = { supabase: { createClient: () => ({ auth: {} }) } };
  core = await import("../../site/js/core.js");
  listings = await import("../../site/js/listings.js");
  format = await import("../../site/js/format.js");
  validate = await import("../../site/js/validate.js");
});

describe("html escaping", () => {
  it("escapes values but keeps raw() markup", () => {
    const { html, raw, markup } = core;
    const out = markup(html`<p title="${'"x"'}">${"<script>alert(1)</script>"}${raw("<b>ok</b>")}</p>`);
    expect(out).toBe('<p title="&quot;x&quot;">&lt;script&gt;alert(1)&lt;/script&gt;<b>ok</b></p>');
  });
});

describe("safeNext", () => {
  it("allows allow-listed same-site paths with query strings", () => {
    expect(core.safeNext("/portal/acme/team")).toBe("/portal/acme/team");
    expect(core.safeNext("/invitations/accept?token=abc")).toBe("/invitations/accept?token=abc");
    expect(core.safeNext("/ops/reports")).toBe("/ops/reports");
  });
  it.each(["https://evil.example/account", "//evil.example/account", "/\\evil.example", "javascript:alert(1)", "/", "/sign-in", "/accountx", ""])(
    "falls back for %j",
    (input) => expect(core.safeNext(input)).toBe("/account"),
  );
});

describe("phone numbers", () => {
  it.each([
    ["024 123 4567", "+233241234567"],
    ["0241234567", "+233241234567"],
    ["233241234567", "+233241234567"],
    ["+233 24-123 4567", "+233241234567"],
    ["00233241234567", "+233241234567"],
    ["+44 7700 900123", "+447700900123"],
  ])("normalises %j to E.164", (input, expected) => {
    expect(validate.phone(input)).toEqual({ value: expected });
  });
  it.each(["", "12345", "024123", "phone", "+0241234567"])("rejects %j", (input) => {
    expect(validate.phone(input).error).toBeTruthy();
  });
});

describe("form rules", () => {
  it("accepts six-digit codes, ignoring spaces", () => {
    expect(validate.otp("123 456")).toEqual({ value: "123456" });
    for (const v of ["12345", "1234567", "abcdef", ""]) expect(validate.otp(v).error).toBeTruthy();
  });
  it("validates slugs like the database check constraint", () => {
    expect(validate.slug("acme-homes").value).toBe("acme-homes");
    for (const v of ["ab", "Acme Homes", "acme--homes", "-acme", "acme_homes"]) expect(validate.slug(v).error).toBeTruthy();
  });
  it("produces database-valid slugs", () => {
    expect(validate.slugify("Kwame & Sons Realty, Accra!")).toBe("kwame-sons-realty-accra");
    expect(validate.slugify("Ébène Homes")).toBe("ebene-homes");
  });
  it("requires https websites", () => {
    expect(validate.httpsUrl("http://acme.example").error).toBeTruthy();
    expect(validate.httpsUrl("https://acme.example").value).toBe("https://acme.example");
    expect(validate.httpsUrl("").value).toBeNull();
  });
  it("serialises money as a fixed decimal and rejects zero", () => {
    expect(validate.money("1,250,000").value).toBe("1250000.00");
    expect(validate.money("0").error).toBeTruthy();
    expect(validate.money("12.345").error).toBeTruthy();
  });
  it("collects errors per field", () => {
    const d = new FormData();
    d.set("name", "");
    d.set("phone", "0241234567");
    const { values, errors } = validate.check(d, { name: (v) => validate.text(v, { label: "Name" }), phone: validate.phone });
    expect(errors).toEqual({ name: "Name is required." });
    expect(values.phone).toBe("+233241234567");
  });
});

describe("formatting", () => {
  it("always shows the ISO currency and the rent period", () => {
    expect(format.formatPrice("1250000.00", "GHS")).toBe("GHS 1,250,000");
    expect(format.formatPrice(85000, "USD")).toBe("USD 85,000");
    expect(format.formatPrice(6500, "GHS", "per_month")).toBe("GHS 6,500/month");
    expect(format.formatPrice(450.5, "GHS", "per_night")).toBe("GHS 450.50/night");
  });
  it("always includes area units", () => {
    expect(format.formatArea("180.00", "sqm")).toBe("180 m²");
  });
  it("reads moderator reason codes as words", () => {
    expect(format.reviewReason("photos")).toBe("Photos need work");
    expect(format.reviewReason("photos_quality")).toBe("Photos quality");
    expect(format.reviewReason(null)).toBe("");
  });
});

describe("search", () => {
  const q = (s) => listings.parseSearch(new URLSearchParams(s));
  it("accepts known filters", () => {
    const f = q("purpose=sale&type=house&min=100000&beds=3&sort=price_asc");
    expect(f).toMatchObject({ purpose: "sale", type: "house", min: 100000, beds: 3, sort: "price_asc" });
    expect(listings.activeFilterCount(f)).toBe(4);
  });
  it("drops unknown or hostile values", () => {
    const f = q("purpose=steal&type=castle&min=-5&beds=lots&currency=ghs");
    expect([f.purpose, f.type, f.min, f.beds, f.currency]).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
  it("strips PostgREST filter syntax from free text", () => {
    expect(q("q=" + encodeURIComponent("accra),title.eq.x,(")).q).toBe("accra title eq x");
    expect(q("q=%20%20").q).toBeUndefined();
  });
  it("round-trips cursors and rejects tampered ones", () => {
    const c = listings.encodeCursor("2026-10-16T12:00:00.123+00:00", "0f8fad5b-d9cb-469f-a165-70867728950e");
    expect(listings.decodeCursor(c)).toEqual({ value: "2026-10-16T12:00:00.123+00:00", id: "0f8fad5b-d9cb-469f-a165-70867728950e" });
    expect(listings.decodeCursor(Buffer.from("x),or(1.eq.1|abc").toString("base64url"))).toBeNull();
    expect(listings.decodeCursor("not-base64!!")).toBeNull();
  });
  it("builds query strings without empty values", () => {
    expect(listings.toQueryString({ q: "accra", purpose: undefined, beds: 2 })).toBe("?q=accra&beds=2");
    expect(listings.toQueryString({})).toBe("");
  });
});
