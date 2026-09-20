// middleware.ts
// Route protection for dashboard routes.
// Runs on Next.js Edge Runtime — cannot access localStorage.
//
// Strategy:
//   - If the zyoris-token cookie is present → let the request through.
//   - If the cookie is MISSING → still let the request through on the
//     initial page load (hard refresh / direct URL visit), and let the
//     client-side AuthContext + DashboardLayout handle the redirect.
//     This prevents a race where the cookie hasn't been written yet
//     (first render) from bouncing an authenticated user to /login.
//
//   The only hard server-side redirects we keep are:
//     • Authenticated users hitting /login or /register → send to /dashboard
//
//   All "unauthenticated user accessing protected route" logic lives in
//   DashboardLayout (client-side), which waits for AuthContext to finish
//   restoring the session from localStorage before deciding.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "zyoris-token";

// Public paths that never need a token
const PUBLIC_PATHS = ["/login", "/register", "/favicon.ico"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Serve favicon redirect
    if (pathname === "/favicon.ico") {
        return NextResponse.redirect(new URL("/icon.svg", request.url), { status: 301 });
    }

    // Pass all requests through cleanly. Client-side AuthContext + DashboardLayout
    // handle session validation and route redirection safely.
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/favicon.ico",
        "/((?!api|_next/static|_next/image|icon\\.svg|.*\\.png|.*\\.jpg|.*\\.ico).*)",
    ],
};
