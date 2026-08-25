import { NextResponse, type NextRequest } from "next/server";

import {
  CALLBACK_URL_COOKIES,
  isValidCallbackUrl,
} from "@/lib/auth/callback-url";

/**
 * Next.js 16 renamed `middleware` to `proxy`. It runs on the Node.js runtime.
 *
 * Two jobs, neither of them authorization:
 *
 *  1. Clear an unusable `authjs.callback-url` cookie. Auth.js rejects a
 *     malformed one with a raw JSON 500 that no error page can intercept, and
 *     because the cookie sticks, sign-in stays broken until it is removed by
 *     hand. Clearing it here makes that recoverable on the next page load.
 *
 *  2. Redirect signed-out visitors away from the app shell. This is a UX
 *     convenience: it inspects cookie presence, not validity. Every page,
 *     server action and route handler independently calls
 *     requireChurchContext() / requirePermission(), which re-reads membership
 *     from the database. Do not move authorization here.
 */
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

const PROTECTED_PREFIXES = [
  "/home",
  "/plan",
  "/songs",
  "/team",
  "/messages",
  "/ask",
  "/settings",
  "/my",
  "/onboarding",
];

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  const response =
    isProtected && !hasSession
      ? NextResponse.redirect(
          (() => {
            const login = new URL("/login", request.url);
            login.searchParams.set("callbackUrl", pathname);
            return login;
          })(),
        )
      : NextResponse.next();

  for (const name of CALLBACK_URL_COOKIES) {
    const cookie = request.cookies.get(name);
    if (cookie && !isValidCallbackUrl(cookie.value, origin)) {
      response.cookies.delete(name);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, the auth endpoints, and public files.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
