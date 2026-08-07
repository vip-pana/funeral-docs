"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getBearers, getDriver } from "@/lib/bearers";
import { clientNameOf } from "@/lib/client-name";
import { getClient } from "@/lib/clients";
import { db, schema } from "@/lib/db";
import { collectErrors } from "@/lib/form-errors";
import { practiceSchema, type PracticeInput } from "@/lib/validation";
import { getVehicle } from "@/lib/vehicles";

export type PracticeFormState = {
  errors?: Record<string, string>;
  message?: string;
};

/**
 * Copies the company name from the chosen client, the plate from the chosen
 * vehicle, and the names from the chosen driver and bearers.
 *
 * Every row is re-read from the database instead of trusting values sent by the
 * client, because they end up in an official document. From here on the record
 * no longer depends on the lists, so deleting a hearse, a driver or a bearer
 * does not change documents already issued.
 *
 * The client is the exception: only its name is copied, to label the record.
 * The documents read the client row itself when they are filled, so correcting
 * an address there fixes every document reprinted afterwards.
 */
async function withSelections(data: PracticeInput) {
  const [client, vehicle, driver, bearers] = await Promise.all([
    getClient(data.clientId),
    data.vehicleId ? getVehicle(data.vehicleId) : null,
    data.driverId ? getDriver(data.driverId) : null,
    getBearers(data.bearerIds),
  ]);
  return {
    ...data,
    // Required by the form, so an id matching no row is a stale list rather
    // than a blank field: null keeps the insert legal and the record editable.
    clientId: client?.id ?? null,
    clientName: client ? clientNameOf(client) : "",
    // A non-existent id becomes null: passing it through would violate the
    // foreign key and fail the insert with a raw error.
    vehicleId: vehicle?.id ?? null,
    // Clearing the vehicle clears the plate — the user is saying "no hearse".
    // Changing it updates the plate, otherwise the field would be misleading:
    // you edit it and nothing happens.
    vehiclePlate: vehicle?.plate ?? "",
    driverId: driver?.id ?? null,
    driverName: driver?.name ?? "",
    // Ids so reopening the record can tick the right boxes, names because those
    // are what document 7 prints. Unknown ids drop out: `getBearers` only
    // returns rows that exist.
    bearerIds: bearers.map((b) => b.id).join(","),
    bearerNames: bearers.map((b) => b.name).join(", "),
  };
}

/** Creates a practice and opens its page straight away. */
export async function createPractice(
  _prev: PracticeFormState,
  formData: FormData,
): Promise<PracticeFormState> {
  const parsed = practiceSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues),
      message: "Controlla i campi segnalati.",
    };
  }

  const [row] = await db
    .insert(schema.practices)
    .values(await withSelections(parsed.data))
    .returning({ id: schema.practices.id });

  revalidatePath("/deceased");
  // Outside any try/catch: redirect() signals by throwing an exception that
  // Next intercepts, and a catch around it would mistake that for an error.
  redirect(`/deceased/${row.id}`);
}

export async function updatePractice(
  id: string,
  _prev: PracticeFormState,
  formData: FormData,
): Promise<PracticeFormState> {
  const parsed = practiceSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues),
      message: "Controlla i campi segnalati.",
    };
  }

  await db
    .update(schema.practices)
    .set({
      ...(await withSelections(parsed.data)),
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(eq(schema.practices.id, id));

  revalidatePath("/deceased");
  revalidatePath(`/deceased/${id}`);
  return { message: "Defunto aggiornato." };
}

export async function deletePractice(id: string) {
  await db.delete(schema.practices).where(eq(schema.practices.id, id));
  revalidatePath("/deceased");
  redirect("/deceased");
}
