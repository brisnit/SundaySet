import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware` to `proxy`. It runs on the Node.js runtime.
 *
 * This is a UX redirect only — it keeps signed-out visitors from landing on an
 * empty app shell. It is NOT an authorization boundary: it inspects cookie
 * presence, not validity. Every page, server action, and route handler
 * independently calls requireChurchContext() / requirePermission(), which
 * re-reads membership from the database.
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
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) =>
    request.cookies.has(name),
  );
  if (hasSession) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Everything except Next internals, the auth endpoints, and public files.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
