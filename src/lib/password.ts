import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

/**
 * The single shared password.
 *
 * Deliberately not in src/lib/auth.ts: the middleware imports from there and
 * runs on the Edge runtime, so a `db` import at the top of that file would drag
 * better-sqlite3 into it and fail the build. auth.ts keeps the session, which
 * is jose only; everything that touches the database lives here.
 */

/** The row is a singleton, always under this id. */
const AUTH_ID = 1;

/** Same cost as scripts/hash-password.ts, so the two produce comparable hashes. */
const COST = 12;

/**
 * The hash from the environment, checked for the one mistake that actually
 * happens: Next's .env parser expands `$xxx` as a variable, so a bcrypt hash
 * pasted without escaping every `$` as `\$` arrives here truncated and every
 * login fails with nothing to explain it.
 */
function envHash(): string {
  const hash = process.env.AUTH_PASSWORD_HASH;
  if (!hash) {
    throw new Error(
      "AUTH_PASSWORD_HASH mancante. Generalo con: pnpm auth:hash <password>",
    );
  }
  if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(hash)) {
    throw new Error(
      "AUTH_PASSWORD_HASH non e' un hash bcrypt valido. Nel .env ogni `$` va " +
        'scritto come `\\$` (es. AUTH_PASSWORD_HASH="\\$2b\\$12\\$..."). ' +
        "Rigeneralo con: pnpm auth:hash <password>",
    );
  }
  return hash;
}

/**
 * The hash in force, seeding the row from the environment the first time.
 *
 * That seeding is what lets an existing installation keep working untouched
 * after this table appeared. Once the row exists AUTH_PASSWORD_HASH is never
 * read again, so changing it in the .env has no effect — the password is
 * changed from Impostazioni.
 */
export async function currentHash(): Promise<string> {
  const [row] = await db
    .select()
    .from(schema.auth)
    .where(eq(schema.auth.id, AUTH_ID))
    .limit(1);

  if (row) return row.passwordHash;

  const seeded = envHash();
  // onConflictDoNothing rather than a plain insert: two requests arriving
  // together would both find the table empty, and the loser must not fail.
  await db
    .insert(schema.auth)
    .values({ id: AUTH_ID, passwordHash: seeded })
    .onConflictDoNothing();
  return seeded;
}

export async function verifyPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, await currentHash());
}

export async function setPassword(plain: string): Promise<void> {
  const hash = await bcrypt.hash(plain, COST);
  await db
    .insert(schema.auth)
    .values({ id: AUTH_ID, passwordHash: hash })
    .onConflictDoUpdate({
      target: schema.auth.id,
      set: {
        passwordHash: hash,
        updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      },
    });
}
