import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Next.js 16+ uses `proxy` (middleware was renamed).
 * Protect all routes except login, Auth.js handlers, and static assets.
 * Cron is gated by CRON_SECRET in its own route handler.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isLogin = pathname.startsWith("/login");
  const isCron = pathname.startsWith("/api/cron");

  if (isAuthRoute || isCron) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLogin) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLogin) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
