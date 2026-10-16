import { describe, expect, it } from "vitest";
import { formatArea, formatPrice, listedAgo } from "@/lib/listings/format";
import { activeFilterCount, decodeCursor, encodeCursor, parseSearch, toQueryString } from "@/lib/listings/search";
import { listingSchema, toPayload } from "@/lib/validation/listing";
import { scaledSize } from "@/lib/media/compress";

describe("formatPrice", () => {
  it("always shows the ISO currency and never converts", () => {
    expect(formatPrice("1250000.00", "GHS")).toBe("GHS 1,250,000");
    expect(formatPrice(85000, "USD")).toBe("USD 85,000");
  });
  it("adds the rent period", () => {
    expect(formatPrice(6500, "GHS", "per_month")).toBe("GHS 6,500/month");
    expect(formatPrice(450.5, "GHS", "per_night")).toBe("GHS 450.50/night");
  });
});

describe("formatArea", () => {
  it("always includes the unit", () => {
    expect(formatArea("180.00", "sqm")).toBe("180 m²");
    expect(formatArea(2, "plot")).toBe("2 plots");
    expect(formatArea(null, "sqm")).toBeNull();
    expect(formatArea(100, null)).toBeNull();
  });
});

describe("listedAgo", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  it("is human friendly", () => {
    expect(listedAgo("2026-10-16T08:00:00Z", now)).toBe("Listed today");
    expect(listedAgo("2026-10-15T08:00:00Z", now)).toBe("Listed yesterday");
    expect(listedAgo("2026-10-06T08:00:00Z", now)).toBe("Listed 10 days ago");
  });
});

describe("parseSearch", () => {
  it("accepts known filters", () => {
    const f = parseSearch({ purpose: "sale", type: "house", min: "100000", beds: "3", sort: "price_asc" });
    expect(f).toMatchObject({ purpose: "sale", type: "house", min: 100000, beds: 3, sort: "price_asc" });
    expect(activeFilterCount(f)).toBe(4);
  });
  it("drops unknown or hostile values", () => {
    const f = parseSearch({ purpose: "steal", type: "castle", min: "-5", beds: "lots", currency: "ghs" });
    expect(f.purpose).toBeUndefined();
    expect(f.type).toBeUndefined();
    expect(f.min).toBeUndefined();
    expect(f.beds).toBeUndefined();
    expect(f.currency).toBeUndefined();
  });
  it("strips PostgREST filter syntax from free text", () => {
    expect(parseSearch({ q: "accra),title.eq.x,(" }).q).toBe("accra title eq x");
    expect(parseSearch({ q: "   " }).q).toBeUndefined();
  });
});

describe("cursor", () => {
  it("round-trips", () => {
    const c = encodeCursor("2026-10-16T12:00:00.123+00:00", "0f8fad5b-d9cb-469f-a165-70867728950e");
    expect(decodeCursor(c)).toEqual({ value: "2026-10-16T12:00:00.123+00:00", id: "0f8fad5b-d9cb-469f-a165-70867728950e" });
  });
  it("rejects tampered cursors", () => {
    expect(decodeCursor(Buffer.from("x),or(1.eq.1|abc").toString("base64url"))).toBeNull();
    expect(decodeCursor("not-base64!!")).toBeNull();
  });
  it("builds query strings without empty values", () => {
    expect(toQueryString({ q: "accra", purpose: undefined, beds: 2 })).toBe("?q=accra&beds=2");
    expect(toQueryString({})).toBe("");
  });
});

describe("listingSchema", () => {
  const base = {
    title: "Family home in East Legon",
    description: "",
    purpose: "sale",
    property_type: "house",
    region: "Greater Accra",
    city: "Accra",
    locality: "",
    address_private: "",
    bedrooms: "3",
    bathrooms: "2",
    floor_area: "180",
    floor_area_unit: "sqm",
    land_area: "",
    land_area_unit: "",
    asking_price: "1,250,000",
    currency: "GHS",
    price_period: "total",
  };
  it("parses a valid sale listing and serialises money as a fixed decimal", () => {
    const v = listingSchema.parse(base);
    expect(toPayload(v).asking_price).toBe("1250000.00");
    expect(toPayload(v).bedrooms).toBe("3");
  });
  it("requires a period for rentals and a total for sales", () => {
    expect(listingSchema.safeParse({ ...base, purpose: "long_term_rent" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, purpose: "long_term_rent", price_period: "per_month" }).success).toBe(true);
    expect(listingSchema.safeParse({ ...base, price_period: "per_month" }).success).toBe(false);
  });
  it("requires units with areas", () => {
    expect(listingSchema.safeParse({ ...base, floor_area_unit: "" }).success).toBe(false);
  });
  it("rejects unknown regions and zero prices", () => {
    expect(listingSchema.safeParse({ ...base, region: "Atlantis" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, asking_price: "0" }).success).toBe(false);
  });
});

describe("scaledSize", () => {
  it("caps the long edge and keeps aspect ratio", () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 2000, height: 1500 });
    expect(scaledSize(1200, 800)).toEqual({ width: 1200, height: 800 });
  });
});
