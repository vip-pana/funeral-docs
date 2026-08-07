import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Driver } from "@/lib/db/schema";

export async function listDrivers(): Promise<Driver[]> {
  return db.select().from(schema.drivers).orderBy(asc(schema.drivers.name));
}

export async function getDriver(id: string): Promise<Driver | null> {
  const [row] = await db
    .select()
    .from(schema.drivers)
    .where(eq(schema.drivers.id, id))
    .limit(1);
  return row ?? null;
}
