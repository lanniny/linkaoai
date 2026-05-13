import { NextResponse, type NextRequest } from "next/server";

// Next.js middleware. Better-auth manages its own session cookie refresh on
// /api/auth/* requests, so we no longer need a Supabase-style session warm-up
// here.
//
// Kept as a thin pass-through so future cross-cutting needs (maintenance
// mode 503, rate limits, redirect rules) have a hook ready.
export function proxy(request: NextRequest): Response {
  // Touch the request object once so the parameter is considered used.
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public image files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
