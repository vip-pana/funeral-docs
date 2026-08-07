"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, schema } from "@/lib/db";
import { getDriver } from "@/lib/drivers";
import { collectErrors } from "@/lib/form-errors";
import { practiceSchema, type PracticeInput } from "@/lib/validation";
import { getVehicle } from "@/lib/vehicles";

export type PracticeFormState = {
  errors?: Record<string, string>;
  message?: string;
};

/**
 * Copies the plate from the chosen vehicle and the name from the chosen driver.
 *
 * Both rows are re-read from the database instead of trusting values sent by
 * the client, because they end up in an official document. From here on the
 * practice no longer depends on the lists, so deleting the hearse or the driver
 * does not change documents already issued.
 */
async function withSelections(data: PracticeInput) {
  const [vehicle, driver] = await Promise.all([
    data.vehicleId ? getVehicle(data.vehicleId) : null,
    data.driverId ? getDriver(data.driverId) : null,
  ]);
  return {
    ...data,
    // A non-existent id becomes null: passing it through would violate the
    // foreign key and fail the insert with a raw error.
    vehicleId: vehicle?.id ?? null,
    // Clearing the vehicle clears the plate — the user is saying "no hearse".
    // Changing it updates the plate, otherwise the field would be misleading:
    // you edit it and nothing happens.
    vehiclePlate: vehicle?.plate ?? "",
    driverId: driver?.id ?? null,
    driverName: driver?.name ?? "",
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

  revalidatePath("/practices");
  // Outside any try/catch: redirect() signals by throwing an exception that
  // Next intercepts, and a catch around it would mistake that for an error.
  redirect(`/practices/${row.id}`);
}

export async function updatePractice(
  id: number,
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

  revalidatePath("/practices");
  revalidatePath(`/practices/${id}`);
  return { message: "Pratica aggiornata." };
}

export async function deletePractice(id: number) {
  await db.delete(schema.practices).where(eq(schema.practices.id, id));
  revalidatePath("/practices");
  redirect("/practices");
}
