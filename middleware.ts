// middleware.ts
// Protects all dashboard routes.
// Runs on the Next.js Edge Runtime — cannot access localStorage.
// Reads the JWT from the "zyoris-token" HttpOnly-compatible cookie that is
// written by the login flow alongside the existing localStorage entry.
// If the cookie is absent or empty the user is redirected to /login.
// Token signature is NOT verified here (no secret available on Edge);
// the backend validates the token on every API request.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "zyoris-token";

export function middleware(request: NextRequest) {
    // Serve favicon.ico from the public SVG icon
    if (request.nextUrl.pathname === "/favicon.ico") {
        return NextResponse.redirect(new URL("/icon.svg", request.url), { status: 301 });
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        const loginUrl = new URL("/login", request.url);
        // Preserve the original destination so we can redirect back after login
        loginUrl.searchParams.set("next", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    // Protect every route under the (dashboard) layout.
    // Excludes /login, /register, API routes, and static assets.
    matcher: [
        "/favicon.ico",
        "/((?!login|register|api|_next/static|_next/image|favicon.ico).*)",
    ],
};
