// Only same-origin, allow-listed paths may be used as post-auth redirect targets.
const ALLOWED_PREFIXES = ["/account", "/onboarding", "/portal", "/invitations", "/ops", "/properties", "/explore"];
const DEFAULT_PATH = "/account";

export function safeRedirectPath(input: string | null | undefined, fallback = DEFAULT_PATH): string {
  if (!input || typeof input !== "string") return fallback;
  if (input.length > 512) return fallback;
  // Must be a root-relative path: reject protocol-relative, backslash and scheme tricks.
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(input)) return fallback;

  let url: URL;
  try {
    url = new URL(input, "http://local.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://local.invalid") return fallback;

  const allowed = ALLOWED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
  return allowed ? url.pathname + url.search : fallback;
}
