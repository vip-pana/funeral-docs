import { asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Client } from "@/lib/db/schema";

export async function listClients(): Promise<Client[]> {
  return db
    .select()
    .from(schema.clients)
    .orderBy(asc(schema.clients.lastName), asc(schema.clients.firstName));
}

export async function getClient(id: string): Promise<Client | null> {
  const [row] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * The template placeholders are still called `owner*`, from when these values
 * came from a single-row `owner` table: renaming them here without renaming
 * them inside the .docx would leave a hole in the printed documents. See
 * src/lib/fields.ts.
 *
 * The hearse and the driver are deliberately absent: the plate, the make and
 * the driver's name depend on what was picked in the individual practice, not
 * on the client.
 */
export function clientValues(client: Client | null): Record<string, string> {
  if (!client) return {};
  return {
    ownerFirstName: client.firstName,
    ownerMiddleName: client.middleName,
    ownerLastName: client.lastName,
    ownerCompanyName: client.companyName,
    ownerCompanyCity: client.companyCity,
    ownerCity: client.city,
    ownerCityName: client.cityName,
    // Identify the declarant in documents 6 and 7. Dates stay ISO here: the
    // conversion to dd/mm/yyyy happens in prepareValues, like every other date.
    ownerBirthDate: client.birthDate,
    ownerBirthCity: client.birthCity,
    ownerAddress: client.address,
    ownerPostalCode: client.postalCode,
    ownerIdType: client.idType,
    ownerIdNumber: client.idNumber,
    ownerIdIssuer: client.idIssuer,
    ownerIdDate: client.idDate,
    // Document 9.
    ownerCitizenship: client.citizenship,
    // Document 11 names the firm's registered office in full. It comes from
    // the billing details, which reached no document until this one.
    ownerCompanyAddress: client.companyAddress,
  };
}
