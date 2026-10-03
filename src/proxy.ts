import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: redirect when there's clearly no session cookie.
// Real authorization happens server-side in getCurrentShop().
const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const hasSession = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("authjs.session-token") ||
        c.name.startsWith("__Secure-authjs.session-token"),
    );
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
