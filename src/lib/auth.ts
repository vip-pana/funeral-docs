import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

/**
 * Single shared password.
 *
 * Tailscale limits who can reach the app; the password guards against a
 * browser left open on an office machine. The session is a signed JWT in an
 * httpOnly cookie, so there is no sessions table to maintain.
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

export function passwordHash(): string {
  const hash = process.env.AUTH_PASSWORD_HASH;
  if (!hash) {
    throw new Error(
      "AUTH_PASSWORD_HASH mancante. Generalo con: pnpm auth:hash <password>",
    );
  }
  // The .env parser expands `$xxx` as a variable: a hash not escaped with
  // `\$` arrives here truncated, and every login would fail unexplained.
  if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(hash)) {
    throw new Error(
      "AUTH_PASSWORD_HASH non e' un hash bcrypt valido. Nel .env ogni `$` va " +
        'scritto come `\\$` (es. AUTH_PASSWORD_HASH="\\$2b\\$12\\$..."). ' +
        "Rigeneralo con: pnpm auth:hash <password>",
    );
  }
  return hash;
}

export async function verifyPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash());
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
