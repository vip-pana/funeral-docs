/**
 * Applies the Drizzle migrations to the SQLite database.
 * Runs on container startup, and by hand in development: `pnpm db:migrate`.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const file = process.env.DATABASE_PATH ?? "./data/funeral.db";
mkdirSync(dirname(file), { recursive: true });

const sqlite = new Database(file);
sqlite.pragma("journal_mode = WAL");

migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
sqlite.close();

console.log(`Migrazioni applicate: ${file}`);
