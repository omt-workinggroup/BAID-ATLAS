import { describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test";
const { normaliseSiteUrl } = await import("@/lib/env");

describe("normaliseSiteUrl", () => {
  it("adds a scheme and trims trailing slashes", () => {
    expect(normaliseSiteUrl("baid-atlas.vercel.app/")).toBe("https://baid-atlas.vercel.app");
    expect(normaliseSiteUrl(" https://example.com/ ")).toBe("https://example.com");
  });
  it("falls back to the Vercel domain, then localhost", () => {
    expect(normaliseSiteUrl("", "baid-atlas.vercel.app")).toBe("https://baid-atlas.vercel.app");
    expect(normaliseSiteUrl("http://exa mple.com", undefined)).toBe("http://localhost:3000");
    expect(normaliseSiteUrl(undefined)).toBe("http://localhost:3000");
  });
});
