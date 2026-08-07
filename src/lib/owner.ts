import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Owner } from "@/lib/db/schema";

/** The company configuration is a single row, always under this id. */
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
 * The plate and the driver name are deliberately absent: they depend on the
 * hearse and the driver picked in the individual practice, not on the company
 * configuration.
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
    // Identify the declarant in documents 6 and 7. Dates stay ISO here: the
    // conversion to dd/mm/yyyy happens in prepareValues, like every other date.
    ownerBirthDate: owner.ownerBirthDate,
    ownerBirthCity: owner.ownerBirthCity,
    ownerAddress: owner.ownerAddress,
    ownerPostalCode: owner.ownerPostalCode,
    ownerIdType: owner.ownerIdType,
    ownerIdNumber: owner.ownerIdNumber,
    ownerIdIssuer: owner.ownerIdIssuer,
    ownerIdDate: owner.ownerIdDate,
  };
}
