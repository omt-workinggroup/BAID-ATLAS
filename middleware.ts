import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
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
