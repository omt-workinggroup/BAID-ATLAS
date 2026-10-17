import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Production has several *.vercel.app addresses; send everyone to one so sign-in cookies and SMS code
// auto-fill (which is tied to a single domain) always match.
const canonicalHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host;
  } catch {
    return "";
  }
})();

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (process.env.VERCEL_ENV === "production" && canonicalHost && host !== canonicalHost && host.endsWith(".vercel.app")) {
    const url = request.nextUrl.clone();
    url.host = canonicalHost;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // The design gallery holds sample data; outside an explicit build flag it must be a real 404, not a
  // streamed not-found page with status 200.
  if (request.nextUrl.pathname.startsWith("/design") && process.env.NEXT_PUBLIC_DESIGN_GALLERY !== "1") {
    return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|icons/|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
