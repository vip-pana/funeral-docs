import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import * as schema from "./schema";

/**
 * Shared SQLite connection, opened on the first query.
 *
 * It cannot be opened at import time: during `next build` page modules are
 * loaded for static analysis, but the database does not exist yet — in the
 * container it comes from a volume mounted at runtime. Opening it there made
 * the build fail with "Failed to collect page data".
 *
 * In development Next reloads modules on every change: caching on the global
 * keeps each reload from opening another connection to the same file.
 */

const DEFAULT_PATH = "./data/funeral.db";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const file = process.env.DATABASE_PATH ?? DEFAULT_PATH;

  // In production the path is a mounted volume: if it is missing that is a
  // deploy error and must surface, not be papered over by creating an empty
  // database that would just look new.
  if (process.env.NODE_ENV !== "production") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const sqlite = new Database(file);
  // WAL: reads and writes do not block each other.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { db?: Db };

export function getDb(): Db {
  if (!globalForDb.db) globalForDb.db = createDb();
  return globalForDb.db;
}

/**
 * Used like a normal instance (`db.select()...`), but the connection opens on
 * the first property access rather than when the module is imported.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
