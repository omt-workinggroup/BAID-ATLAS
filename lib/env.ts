// Public configuration. Values are inlined at build time by Next.js.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// Accepts "example.com", "https://example.com/" or nothing; on Vercel falls back to the production domain.
// A malformed value must never break a build, so anything unparsable falls back too.
export function normaliseSiteUrl(raw: string | undefined, vercelHost?: string): string {
  const candidates = [raw, vercelHost, "http://localhost:3000"];
  for (const c of candidates) {
    const v = c?.trim();
    if (!v) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      return url.origin;
    } catch {
      // try the next candidate
    }
  }
  return "http://localhost:3000";
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  siteUrl: normaliseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL),
};
