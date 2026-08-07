import type { Client } from "@/lib/db/schema";

/**
 * How a client is named on screen and on the records that pick one.
 *
 * Kept apart from src/lib/clients.ts, which opens the database: the practice
 * form is a client component, and importing these from there would drag
 * better-sqlite3 into the browser bundle and fail the build.
 */

export function personName(
  client: Pick<Client, "firstName" | "middleName" | "lastName">,
): string {
  return [client.firstName, client.middleName, client.lastName]
    .filter(Boolean)
    .join(" ");
}

/** For the picker, where both parts help tell two clients apart. */
export function clientLabel(
  client: Pick<Client, "companyName" | "firstName" | "middleName" | "lastName">,
): string {
  return `${client.companyName} — ${personName(client)}`;
}

/**
 * The name copied onto a record when the client is picked. Only the company:
 * it is what the records list shows, and the declarant's own name is already
 * read live from the client row when the documents are filled.
 */
export function clientNameOf(client: Pick<Client, "companyName">): string {
  return client.companyName;
}
