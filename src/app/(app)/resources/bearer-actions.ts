"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { collectErrors } from "@/lib/form-errors";
import { bearerSchema } from "@/lib/validation";

/**
 * Kept separate from `actions.ts`: saving here is independent of saving the
 * company data, and a shared `useActionState` would surface one form's errors
 * on the other.
 */

export type BearerFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

function revalidateBearerViews() {
  revalidatePath("/resources");
  // The second argument matters: without it /deceased/new and /deceased/[id]
  // would keep the stale list in their checkboxes.
  revalidatePath("/deceased", "layout");
}

export async function addBearer(
  _prev: BearerFormState,
  formData: FormData,
): Promise<BearerFormState> {
  // Field read explicitly rather than via Object.fromEntries: that collapses
  // repeated names to the last one, and would break silently if this form ever
  // became multi-row.
  const parsed = bearerSchema.safeParse({
    name: formData.get("bearerName"),
    isDriver: formData.get("bearerIsDriver"),
  });

  if (!parsed.success) {
    return {
      // Reported under the input's own name, which differs from the column so
      // it does not collide with the other cards' "name" fields.
      errors: collectErrors(parsed.error.issues, { name: "bearerName" }),
      message: "Controlla i campi segnalati.",
    };
  }

  await db.insert(schema.bearers).values(parsed.data);

  revalidateBearerViews();
  return { ok: true, message: "Necroforo aggiunto." };
}

/**
 * Whether they drive the hearse. Separate from `addBearer` because it is toggled
 * straight from the table row, with no form around it.
 */
export async function setBearerDriver(id: string, isDriver: boolean) {
  // The practices that already picked them keep the reference: unticking the box
  // takes them out of the list for new records, it does not rewrite old ones.
  await db
    .update(schema.bearers)
    .set({ isDriver })
    .where(eq(schema.bearers.id, id));
  revalidateBearerViews();
}

export async function deleteBearer(id: string) {
  // Practices that used them keep the copied names: the bearers are stored as a
  // copied string, and a practice that picked them as driver has its reference
  // nulled out (ON DELETE SET NULL) while `driver_name` survives. Either way the
  // documents already issued stay unchanged.
  await db.delete(schema.bearers).where(eq(schema.bearers.id, id));
  revalidateBearerViews();
}
