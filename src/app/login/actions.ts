"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

/**
 * Minimum delay per attempt. Not a full rate limiter, but on a private network
 * it is enough to make trying passwords in sequence impractical.
 */
const MIN_ATTEMPT_MS = 500;

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const started = Date.now();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/deceased");

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
    // A `secure` cookie only travels over https. Browsers make an exception
    // for localhost but not for a Tailscale address (100.x.y.z): there the app
    // is reachable over http and the cookie would not be stored at all, making
    // login impossible. COOKIE_SECURE=false covers that case; confidentiality
    // still comes from the private network.
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  // Internal paths only: an absolute `next` would turn the login into an open
  // redirect to an external site.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/deceased");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
