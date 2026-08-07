import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import * as schema from "./schema";

/**
 * Connessione SQLite condivisa, aperta alla prima query.
 *
 * L'apertura non puo' avvenire all'import: durante `next build` i moduli delle
 * pagine vengono caricati per l'analisi statica, ma il database non esiste
 * ancora — nel container arriva da un volume montato a runtime. Aprirlo li'
 * faceva fallire il build con "Failed to collect page data".
 *
 * In sviluppo Next ricarica i moduli a ogni modifica: la cache sul global
 * evita che ogni ricarica apra una connessione in piu' sullo stesso file.
 */

const DEFAULT_PATH = "./data/funeral.db";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const file = process.env.DATABASE_PATH ?? DEFAULT_PATH;

  // In produzione il percorso e' un volume montato: se manca, e' un errore di
  // deploy e va segnalato, non aggirato creando un database vuoto che
  // sembrerebbe semplicemente nuovo.
  if (process.env.NODE_ENV !== "production") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const sqlite = new Database(file);
  // WAL: letture e scritture non si bloccano a vicenda.
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
 * Si usa come un'istanza normale (`db.select()...`), ma la connessione si apre
 * al primo accesso a una proprieta', non quando il modulo viene importato.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
