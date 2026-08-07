"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
  verifyPassword,
} from "@/lib/auth";

/**
 * Ritardo minimo su ogni tentativo. Non e' un rate limiter completo, ma su una
 * rete privata basta a rendere impraticabile provare password in sequenza.
 */
const MIN_ATTEMPT_MS = 500;

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const started = Date.now();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/pratiche");

  const ok = password.length > 0 && (await verifyPassword(password));

  const elapsed = Date.now() - started;
  if (elapsed < MIN_ATTEMPT_MS) {
    await new Promise((r) => setTimeout(r, MIN_ATTEMPT_MS - elapsed));
  }

  if (!ok) return { error: "Password errata." };

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    sameSite: "lax",
    // Un cookie `secure` viaggia solo su https. Il browser fa un'eccezione per
    // localhost, ma non per un indirizzo Tailscale (100.x.y.z): li' l'app e'
    // raggiungibile in http e il cookie non verrebbe memorizzato affatto,
    // rendendo impossibile l'accesso. COOKIE_SECURE=false copre quel caso;
    // la riservatezza la garantisce comunque la rete privata.
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  // Solo percorsi interni: un `next` assoluto trasformerebbe il login in un
  // redirect aperto verso l'esterno.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/pratiche");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
