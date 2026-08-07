"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, schema } from "@/lib/db";
import { practiceSchema, type PracticeInput } from "@/lib/validation";
import { getVehicle } from "@/lib/vehicles";

export type PracticeFormState = {
  errors?: Record<string, string>;
  message?: string;
};

/**
 * Copies the plate from the chosen vehicle.
 *
 * The vehicle is re-read from the database instead of trusting a value sent by
 * the client, because the plate ends up in an official document. From here on
 * the practice no longer depends on the list, so deleting the hearse does not
 * change documents already issued.
 */
async function withVehiclePlate(data: PracticeInput) {
  const vehicle = data.vehicleId ? await getVehicle(data.vehicleId) : null;
  return {
    ...data,
    // A non-existent id becomes null: passing it through would violate the
    // foreign key and fail the insert with a raw error.
    vehicleId: vehicle?.id ?? null,
    // Clearing the vehicle clears the plate — the user is saying "no hearse".
    // Changing it updates the plate, otherwise the field would be misleading:
    // you edit it and nothing happens.
    vehiclePlate: vehicle?.plate ?? "",
  };
}

function collectErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    // One message per field: the form shows a single one at a time.
    errors[key] ??= issue.message;
  }
  return errors;
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
    .values(await withVehiclePlate(parsed.data))
    .returning({ id: schema.practices.id });

  revalidatePath("/pratiche");
  // Outside any try/catch: redirect() signals by throwing an exception that
  // Next intercepts, and a catch around it would mistake that for an error.
  redirect(`/pratiche/${row.id}`);
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
      ...(await withVehiclePlate(parsed.data)),
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(eq(schema.practices.id, id));

  revalidatePath("/pratiche");
  revalidatePath(`/pratiche/${id}`);
  return { message: "Pratica aggiornata." };
}

export async function deletePractice(id: number) {
  await db.delete(schema.practices).where(eq(schema.practices.id, id));
  revalidatePath("/pratiche");
  redirect("/pratiche");
}
