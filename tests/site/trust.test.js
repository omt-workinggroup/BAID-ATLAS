// The trust panel must only state what was recorded, and say what each line does not prove.
import { beforeAll, describe, expect, it } from "vitest";

let trust;
beforeAll(async () => {
  globalThis.window ??= { supabase: { createClient: () => ({ auth: {} }) } };
  trust = await import("../../site/js/trust.js");
});

const NOW = Date.parse("2026-10-18T12:00:00Z");
const day = (n) => new Date(NOW - n * 86_400_000).toISOString();
const verifiedOrg = { verification_status: "verified", verification_scope: "Business registration matches organisation name", verified_at: day(10), verification_expires_at: day(-300) };
const byKey = (rows) => Object.fromEntries(rows.map((r) => [r.key, r]));

describe("availabilityState", () => {
  it("is fresh up to 30 days, stale after, none without a date", () => {
    expect(trust.availabilityState(day(0), NOW)).toEqual({ state: "fresh", days: 0 });
    expect(trust.availabilityState(day(30), NOW).state).toBe("fresh");
    expect(trust.availabilityState(day(31), NOW).state).toBe("stale");
    expect(trust.availabilityState(null, NOW)).toEqual({ state: "none", days: null });
  });
});

describe("trustItems", () => {
  it("always shows five separate lines, never one overall badge", () => {
    const rows = trust.trustItems({}, null, [], NOW);
    expect(rows.map((r) => r.key)).toEqual(["identity", "visit", "documents", "photos", "availability"]);
  });

  it("identity check never claims ownership", () => {
    const r = byKey(trust.trustItems({}, verifiedOrg, [], NOW)).identity;
    expect(r.status).toBe("checked");
    expect(r.detail).toContain("Business registration matches organisation name");
    expect(r.limits).toMatch(/does not prove they own this property/);
  });

  it("an expired or missing identity check is not shown as checked", () => {
    expect(byKey(trust.trustItems({}, { ...verifiedOrg, verification_expires_at: day(1) }, [], NOW)).identity.status).toBe("attention");
    expect(byKey(trust.trustItems({}, { verification_status: "pending" }, [], NOW)).identity.status).toBe("none");
  });

  it("visits and documents read 'not recorded' and documents never imply title", () => {
    const rows = byKey(trust.trustItems({}, verifiedOrg, [], NOW));
    expect(rows.visit).toMatchObject({ status: "none", value: "Not recorded" });
    expect(rows.documents).toMatchObject({ status: "none", value: "Not reviewed" });
    expect(rows.documents.limits).toMatch(/not a legal title certification/);
  });

  it("photos are attributed to the advertiser and labelled renders are counted", () => {
    const r = byKey(trust.trustItems({}, null, [{}, { is_render: true }, { is_virtually_staged: true }], NOW)).photos;
    expect(r.value).toBe("Uploaded by the advertiser");
    expect(r.detail).toContain("3 photos, 2 labelled as render or virtually staged");
    expect(r.status).toBe("none");
  });

  it("availability shows the recorded date and method", () => {
    const fresh = byKey(trust.trustItems({ availability_confirmed_at: day(3), availability_method: "advertiser" }, null, [], NOW)).availability;
    expect(fresh).toMatchObject({ status: "checked", value: "Confirmed 3 days ago" });
    expect(fresh.detail).toContain("by the advertiser");
    const stale = byKey(trust.trustItems({ availability_confirmed_at: day(45), availability_method: "advertiser" }, null, [], NOW)).availability;
    expect(stale).toMatchObject({ status: "attention", value: "Needs reconfirming" });
  });

  it("being sponsored changes nothing", () => {
    const plain = trust.trustItems({ availability_confirmed_at: day(3), availability_method: "advertiser" }, null, [], NOW);
    const paid = trust.trustItems({ availability_confirmed_at: day(3), availability_method: "advertiser", is_sponsored: true }, null, [], NOW);
    expect(paid).toEqual(plain);
  });
});
