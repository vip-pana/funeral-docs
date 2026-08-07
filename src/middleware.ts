import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Blocca ogni pagina finche' non c'e' una sessione valida.
 *
 * Il matcher esclude gli asset statici: senza quell'esclusione anche CSS e
 * immagini passerebbero dalla verifica del token a ogni richiesta.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authenticated = await isValidSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/pratiche", request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const login = new URL("/login", request.url);
    // Dopo l'accesso si torna dove si era diretti.
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
