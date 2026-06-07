import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Host-based separation of the admin panel from the player site (Next 16 "proxy",
// formerly "middleware").
// - admin.ashnance.com  → serves ONLY the /admin area (its own login + console).
// - www/apex            → the player site; /admin is NOT reachable here.
export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const isAdminHost = host.startsWith("admin.");
  const { pathname } = req.nextUrl;

  if (isAdminHost) {
    // On the admin subdomain, anything outside /admin/* is redirected into it.
    if (!pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  } else {
    // On the player site, the admin area does not exist.
    if (pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    // The old owner panel is consolidated into the admin console.
    if (pathname.startsWith("/owner")) {
      return NextResponse.redirect("https://admin.ashnance.com");
    }
  }
  return NextResponse.next();
}

export const config = {
  // Run on page routes only — skip Next internals and static assets (paths with a dot).
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
