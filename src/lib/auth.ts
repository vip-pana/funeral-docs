import { SignJWT, jwtVerify } from "jose";

/**
 * The session.
 *
 * Tailscale limits who can reach the app; the password guards against a
 * browser left open on an office machine. The session is a signed JWT in an
 * httpOnly cookie, so there is no sessions table to maintain.
 *
 * Nothing here touches the database, on purpose: src/middleware.ts imports this
 * file and runs on the Edge runtime, where better-sqlite3 cannot be loaded. The
 * password lives in src/lib/password.ts.
 *
 * The token carries no password material, so changing the password does not
 * invalidate the sessions already open. Rotating SESSION_SECRET does.
 */

export const SESSION_COOKIE = "funeral_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  // A silent default would let anyone who knows the value forge sessions:
  // better not to start at all.
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET mancante o troppo corta (minimo 32 caratteri). " +
        "Generane una con: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSession(): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
