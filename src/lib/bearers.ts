import { asc, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Bearer } from "@/lib/db/schema";

export async function listBearers(): Promise<Bearer[]> {
  return db.select().from(schema.bearers).orderBy(asc(schema.bearers.name));
}

/**
 * The chosen bearers, in the order the list shows them rather than the order
 * they were ticked: document 7 prints them as one sentence, and a stable order
 * keeps a reprint identical.
 */
export async function getBearers(ids: string[]): Promise<Bearer[]> {
  if (!ids.length) return [];
  return db
    .select()
    .from(schema.bearers)
    .where(inArray(schema.bearers.id, ids))
    .orderBy(asc(schema.bearers.name));
}
