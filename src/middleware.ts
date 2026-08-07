import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Blocks every page until there is a valid session.
 *
 * The matcher excludes static assets: without that exclusion CSS and images
 * would go through token verification on every request too.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authenticated = await isValidSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/deceased", request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const login = new URL("/login", request.url);
    // After logging in, return to where the user was headed.
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
