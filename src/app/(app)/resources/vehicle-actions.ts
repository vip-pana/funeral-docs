"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { collectErrors } from "@/lib/form-errors";
import { vehicleSchema } from "@/lib/validation";

/**
 * Kept separate from `actions.ts`: saving here is independent of saving the
 * company data, and a shared `useActionState` would surface one form's errors
 * on the other.
 */

export type VehicleFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

function revalidateVehicleViews() {
  revalidatePath("/resources");
  // The second argument matters: without it /deceased/new and /deceased/[id]
  // would keep the stale list in their Select.
  revalidatePath("/deceased", "layout");
}

export async function addVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  // Fields read one by one rather than via Object.fromEntries: that collapses
  // repeated names to the last one, and would break silently if this form ever
  // became multi-row.
  const parsed = vehicleSchema.safeParse({
    name: formData.get("name"),
    plate: formData.get("plate"),
  });

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues),
      message: "Controlla i campi segnalati.",
    };
  }

  await db.insert(schema.vehicles).values(parsed.data);

  revalidateVehicleViews();
  return { ok: true, message: "Autofunebre aggiunta." };
}

export async function deleteVehicle(id: string) {
  // Practices that used it keep the copied plate: the reference nulls itself
  // out (ON DELETE SET NULL) and the documents stay unchanged.
  await db.delete(schema.vehicles).where(eq(schema.vehicles.id, id));
  revalidateVehicleViews();
}
