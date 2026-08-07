import { asc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Bearer } from "@/lib/db/schema";

export async function listBearers(): Promise<Bearer[]> {
  return db.select().from(schema.bearers).orderBy(asc(schema.bearers.name));
}

/**
 * The drivers are the bearers flagged as such: anyone on the staff can drive the
 * hearse, and the flag says who actually does.
 */
export async function listDrivers(): Promise<Bearer[]> {
  return db
    .select()
    .from(schema.bearers)
    .where(eq(schema.bearers.isDriver, true))
    .orderBy(asc(schema.bearers.name));
}

/**
 * Not filtered on the flag: a record saved earlier keeps pointing at whoever was
 * chosen then, and unticking the box should not make the practice look empty.
 */
export async function getDriver(id: string): Promise<Bearer | null> {
  const [row] = await db
    .select()
    .from(schema.bearers)
    .where(eq(schema.bearers.id, id))
    .limit(1);
  return row ?? null;
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
