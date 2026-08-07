import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Owner } from "@/lib/db/schema";

/** La configurazione della ditta e' una riga sola, sempre con questo id. */
export const OWNER_ID = 1;

export async function getOwner(): Promise<Owner | null> {
  const [row] = await db
    .select()
    .from(schema.owner)
    .where(eq(schema.owner.id, OWNER_ID))
    .limit(1);
  return row ?? null;
}

/**
 * Valori della ditta pronti per riempire i template.
 *
 * La targa non e' qui: dipende dall'autofunebre scelta nella singola pratica,
 * non dalla configurazione dell'impresa.
 */
export function ownerValues(owner: Owner | null): Record<string, string> {
  if (!owner) return {};
  return {
    ownerFirstName: owner.ownerFirstName,
    ownerMiddleName: owner.ownerMiddleName,
    ownerLastName: owner.ownerLastName,
    ownerCompanyName: owner.ownerCompanyName,
    ownerCompanyCity: owner.ownerCompanyCity,
    ownerCity: owner.ownerCity,
    ownerCityName: owner.ownerCityName,
    ownerDriverName: owner.ownerDriverName,
  };
}
