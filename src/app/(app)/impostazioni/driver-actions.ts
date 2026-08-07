"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { driverSchema } from "@/lib/validation";

/**
 * Kept separate from `actions.ts`: saving here is independent of saving the
 * company data, and a shared `useActionState` would surface one form's errors
 * on the other.
 */

export type DriverFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

function revalidateDriverViews() {
  revalidatePath("/impostazioni");
  // The second argument matters: without it /pratiche/nuova and /pratiche/[id]
  // would keep the stale list in their Select.
  revalidatePath("/pratiche", "layout");
}

export async function addDriver(
  _prev: DriverFormState,
  formData: FormData,
): Promise<DriverFormState> {
  // Field read explicitly rather than via Object.fromEntries: that collapses
  // repeated names to the last one, and would break silently if this form ever
  // became multi-row.
  const parsed = driverSchema.safeParse({ name: formData.get("driverName") });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      // Reported under the input's own name, which differs from the column so
      // it does not collide with the vehicle form's "name" field.
      errors.driverName ??= issue.message;
    }
    return { errors, message: "Controlla i campi segnalati." };
  }

  await db.insert(schema.drivers).values(parsed.data);

  revalidateDriverViews();
  return { ok: true, message: "Conducente aggiunto." };
}

export async function deleteDriver(id: number) {
  // Practices that used them keep the copied name: the reference nulls itself
  // out (ON DELETE SET NULL) and the documents stay unchanged.
  await db.delete(schema.drivers).where(eq(schema.drivers.id, id));
  revalidateDriverViews();
}
