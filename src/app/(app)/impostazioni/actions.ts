"use server";

import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { OWNER_ID } from "@/lib/owner";
import { ownerSchema } from "@/lib/validation";

export type OwnerFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

/**
 * `ownerRequestDate` non fa parte della configurazione: cambia a ogni pratica,
 * quindi si compila li' e non qui.
 */
const settingsSchema = ownerSchema.omit({ ownerRequestDate: true });

export async function saveOwner(
  _prev: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      // Solo il primo errore per campo: il form ne mostra uno alla volta.
      errors[key] ??= issue.message;
    }
    return { errors, message: "Controlla i campi segnalati." };
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
