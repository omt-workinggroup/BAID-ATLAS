import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/auth/redirect";

describe("safeRedirectPath", () => {
  it("allows allow-listed same-origin paths with query strings", () => {
    expect(safeRedirectPath("/portal/acme/team")).toBe("/portal/acme/team");
    expect(safeRedirectPath("/invitations/accept?token=abc")).toBe("/invitations/accept?token=abc");
    expect(safeRedirectPath("/account")).toBe("/account");
  });

  it.each([
    "https://evil.example/account",
    "//evil.example/account",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/account\u0000",
    "/",
    "/sign-in",
    "/accountx",
    "/portal/../../evil",
    "",
  ])("falls back for %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/account");
  });

  it("normalises dot segments before checking the allow-list", () => {
    expect(safeRedirectPath("/portal/../account")).toBe("/account");
  });

  it("uses the provided fallback", () => {
    expect(safeRedirectPath(null, "/onboarding")).toBe("/onboarding");
  });
});
