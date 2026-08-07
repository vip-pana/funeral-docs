"use server";

import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { collectErrors } from "@/lib/form-errors";
import { OWNER_ID } from "@/lib/owner";
import { ownerSchema } from "@/lib/validation";

export type OwnerFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

/**
 * `ownerRequestDate` is not part of the configuration: it changes with every
 * practice, so it is filled in there rather than here.
 */
const settingsSchema = ownerSchema.omit({ ownerRequestDate: true });

export async function saveOwner(
  _prev: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues),
      message: "Controlla i campi segnalati.",
    };
  }

  const values = parsed.data;

  await db
    .insert(schema.owner)
    .values({ id: OWNER_ID, ...values })
    .onConflictDoUpdate({
      target: schema.owner.id,
      set: {
        ...values,
        updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      },
    });

  revalidatePath("/impostazioni");
  return { ok: true, message: "Impostazioni salvate." };
}
