import { NextRequest, NextResponse } from "next/server";

// Lightweight cookie-presence gate; real verification happens server-side in layouts/APIs
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("session")?.value);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
