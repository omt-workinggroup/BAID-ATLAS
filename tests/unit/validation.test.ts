import { describe, expect, it } from "vitest";
import {
  createOrganizationSchema,
  inviteSchema,
  newPasswordSchema,
  profileSchema,
  signUpSchema,
  slugify,
  updateOrganizationSchema,
} from "@/lib/validation/schemas";

describe("signUpSchema", () => {
  it("normalises email and accepts a strong password", () => {
    const r = signUpSchema.parse({ email: "  Ama@Example.COM ", password: "goldcoast2026" });
    expect(r.email).toBe("ama@example.com");
  });
  it.each(["short1", "allletterspassword", "1234567890"])("rejects weak password %j", (password) => {
    expect(signUpSchema.safeParse({ email: "a@b.co", password }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("requires matching confirmation", () => {
    const r = newPasswordSchema.safeParse({ password: "goldcoast2026", confirm: "goldcoast2025" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["confirm"]);
  });
});

describe("profileSchema", () => {
  it("normalises phone numbers and allows empty", () => {
    expect(profileSchema.parse({ display_name: "Ama", phone: "+233 20-123 4567", preferred_currency: "GHS", preferred_locale: "en-GH" }).phone).toBe("+233201234567");
    expect(profileSchema.parse({ display_name: "Ama", phone: "", preferred_currency: "GHS", preferred_locale: "en-GH" }).phone).toBeNull();
  });
  it("rejects local-format phone and unsupported currency", () => {
    expect(profileSchema.safeParse({ display_name: "Ama", phone: "0201234567", preferred_currency: "GHS", preferred_locale: "en-GH" }).success).toBe(false);
    expect(profileSchema.safeParse({ display_name: "Ama", phone: "", preferred_currency: "XYZ", preferred_locale: "en-GH" }).success).toBe(false);
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
    expect(inviteSchema.safeParse({ email: "a@b.co", role: "owner" }).success).toBe(false);
    expect(inviteSchema.safeParse({ email: "a@b.co", role: "listing_manager" }).success).toBe(true);
  });
});

describe("slugify", () => {
  it("produces database-valid slugs", () => {
    expect(slugify("Kwame & Sons Realty, Accra!")).toBe("kwame-sons-realty-accra");
    expect(slugify("Ébène Homes")).toBe("ebene-homes");
  });
});
