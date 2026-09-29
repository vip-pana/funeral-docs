import { between } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { BearerDay } from "@/lib/db/schema";

/** The marked days of one month ("yyyy-mm"), for every bearer. */
export async function listBearerDays(month: string): Promise<BearerDay[]> {
  // ISO dates sort as text, so the month is a plain string range.
  return db
    .select()
    .from(schema.bearerDays)
    .where(between(schema.bearerDays.date, `${month}-01`, `${month}-31`));
}
