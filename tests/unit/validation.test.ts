import { describe, expect, it } from "vitest";
import {
  createOrganizationSchema,
  inviteSchema,
  normalisePhone,
  otpSchema,
  phoneSignInSchema,
  profileSchema,
  slugify,
  updateOrganizationSchema,
} from "@/lib/validation/schemas";

describe("phone numbers", () => {
  it.each([
    ["024 123 4567", "+233241234567"],
    ["0241234567", "+233241234567"],
    ["233241234567", "+233241234567"],
    ["+233 24-123 4567", "+233241234567"],
    ["00233241234567", "+233241234567"],
    ["+44 7700 900123", "+447700900123"],
  ])("normalises %j to E.164", (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
    expect(phoneSignInSchema.parse({ phone: input }).phone).toBe(expected);
  });
  it.each(["", "12345", "024123", "phone", "+0241234567"])("rejects %j", (phone) => {
    expect(phoneSignInSchema.safeParse({ phone }).success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts six digits, ignoring spaces", () => {
    expect(otpSchema.parse({ token: "123 456" }).token).toBe("123456");
  });
  it.each(["12345", "1234567", "abcdef", ""])("rejects %j", (token) => {
    expect(otpSchema.safeParse({ token }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("doesn't accept a phone change (the sign-in number is managed by verification)", () => {
    const r = profileSchema.parse({ display_name: "Ama", phone: "+233201234567", preferred_currency: "GHS", preferred_locale: "en-GH" });
    expect("phone" in r).toBe(false);
  });
  it("rejects unsupported currency", () => {
    expect(profileSchema.safeParse({ display_name: "Ama", preferred_currency: "XYZ", preferred_locale: "en-GH" }).success).toBe(false);
  });
});

describe("organisation schemas", () => {
  it("validates slugs like the database check constraint", () => {
    expect(createOrganizationSchema.safeParse({ name: "Acme", slug: "acme-homes", type: "agency" }).success).toBe(true);
    for (const slug of ["ab", "Acme Homes", "acme--homes", "-acme", "acme_homes"]) {
      expect(createOrganizationSchema.safeParse({ name: "Acme", slug, type: "agency" }).success).toBe(false);
    }
  });
  it("rejects unknown organisation types", () => {
    expect(createOrganizationSchema.safeParse({ name: "Acme", slug: "acme", type: "bank" }).success).toBe(false);
  });
  it("requires https websites", () => {
    const base = { name: "Acme", description: "", public_email: "", public_phone: "" };
    expect(updateOrganizationSchema.safeParse({ ...base, website: "http://acme.example" }).success).toBe(false);
    expect(updateOrganizationSchema.parse({ ...base, website: "https://acme.example" }).website).toBe("https://acme.example");
    expect(updateOrganizationSchema.parse({ ...base, website: "" }).website).toBeNull();
  });
  it("never allows inviting an owner", () => {
    expect(inviteSchema.safeParse({ phone: "0241234567", role: "owner" }).success).toBe(false);
    expect(inviteSchema.parse({ phone: "0241234567", role: "listing_manager" }).phone).toBe("+233241234567");
  });
});

describe("slugify", () => {
  it("produces database-valid slugs", () => {
    expect(slugify("Kwame & Sons Realty, Accra!")).toBe("kwame-sons-realty-accra");
    expect(slugify("Ébène Homes")).toBe("ebene-homes");
  });
});
