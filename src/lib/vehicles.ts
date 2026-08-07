import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Vehicle } from "@/lib/db/schema";

export async function listVehicles(): Promise<Vehicle[]> {
  return db.select().from(schema.vehicles).orderBy(asc(schema.vehicles.name));
}

export async function getVehicle(id: number): Promise<Vehicle | null> {
  const [row] = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, id))
    .limit(1);
  return row ?? null;
}
