"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { collectErrors } from "@/lib/form-errors";
import { bearerSchema, shoulderHeight } from "@/lib/validation";

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
    hasContract: formData.get("bearerHasContract"),
    shoulderHeight: formData.get("bearerShoulderHeight"),
  });

  if (!parsed.success) {
    return {
      // Reported under the input's own name, which differs from the column so
      // it does not collide with the other cards' "name" fields.
      errors: collectErrors(parsed.error.issues, {
        name: "bearerName",
        shoulderHeight: "bearerShoulderHeight",
      }),
      message: "Controlla i campi segnalati.",
    };
  }

  await db.insert(schema.bearers).values(parsed.data);

  revalidateBearerViews();
  return { ok: true, message: "Necroforo aggiunto." };
}

/**
 * Every field of an existing bearer at once, from the edit dialog. The id is
 * bound on the server side of the call, like `deleteBearer`.
 *
 * Practices keep the names they copied when saved: renaming someone here
 * changes the lists and the calendar, not the documents already issued.
 */
export async function updateBearer(
  id: string,
  _prev: BearerFormState,
  formData: FormData,
): Promise<BearerFormState> {
  const parsed = bearerSchema.safeParse({
    name: formData.get("editBearerName"),
    isDriver: formData.get("editBearerIsDriver"),
    hasContract: formData.get("editBearerHasContract"),
    shoulderHeight: formData.get("editBearerShoulderHeight"),
  });

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues, {
        name: "editBearerName",
        shoulderHeight: "editBearerShoulderHeight",
      }),
      message: "Controlla i campi segnalati.",
    };
  }

  await db
    .update(schema.bearers)
    .set(parsed.data)
    .where(eq(schema.bearers.id, id));

  revalidateBearerViews();
  revalidatePath("/calendar");
  return { ok: true, message: "Necroforo aggiornato." };
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

/**
 * Whether they are on a contract rather than called in, toggled from the row
 * like the driver flag. The calendar scores their ferie from it, past months
 * included: the points are worked out when shown, never stored.
 */
export async function setBearerContract(id: string, hasContract: boolean) {
  await db
    .update(schema.bearers)
    .set({ hasContract })
    .where(eq(schema.bearers.id, id));
  revalidateBearerViews();
  revalidatePath("/calendar");
}

/**
 * Edited straight from the table row, like the driver flag: the bearers
 * entered before this field existed need a way to get one.
 */
export async function setBearerShoulderHeight(
  id: string,
  value: string,
): Promise<{ error?: string }> {
  const parsed = shoulderHeight.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(schema.bearers)
    .set({ shoulderHeight: parsed.data })
    .where(eq(schema.bearers.id, id));
  revalidateBearerViews();
  return {};
}

export async function deleteBearer(id: string) {
  // Practices that used them keep the copied names: the bearers are stored as a
  // copied string, and a practice that picked them as driver has its reference
  // nulled out (ON DELETE SET NULL) while `driver_name` survives. Either way the
  // documents already issued stay unchanged.
  await db.delete(schema.bearers).where(eq(schema.bearers.id, id));
  revalidateBearerViews();
}
