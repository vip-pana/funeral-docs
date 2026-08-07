"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { vehicleSchema } from "@/lib/validation";

/**
 * Gestione dell'elenco autofunebri.
 *
 * File separato da `actions.ts`: il salvataggio e' indipendente da quello dei
 * dati della ditta, e uno stato `useActionState` condiviso farebbe comparire
 * gli errori di un form sull'altro.
 */

export type VehicleFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

/** Le pagine che mostrano l'elenco: Impostazioni e il Select delle pratiche. */
function revalidateVehicleViews() {
  revalidatePath("/impostazioni");
  // Il secondo argomento serve: senza, /pratiche/nuova e /pratiche/[id]
  // resterebbero con l'elenco vecchio nel Select.
  revalidatePath("/pratiche", "layout");
}

export async function addVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  // Campi letti uno a uno invece che con Object.fromEntries: quello collassa i
  // nomi omonimi tenendo solo l'ultimo, e si romperebbe in silenzio se un
  // giorno il form diventasse multi-riga.
  const parsed = vehicleSchema.safeParse({
    name: formData.get("name"),
    plate: formData.get("plate"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      // Un solo messaggio per campo: il form ne mostra uno alla volta.
      errors[key] ??= issue.message;
    }
    return { errors, message: "Controlla i campi segnalati." };
  }

  await db.insert(schema.vehicles).values(parsed.data);

  revalidateVehicleViews();
  return { ok: true, message: "Autofunebre aggiunta." };
}

export async function deleteVehicle(id: number) {
  // Le pratiche che la usavano conservano la targa copiata: il riferimento si
  // annulla da solo (ON DELETE SET NULL) e i documenti restano invariati.
  await db.delete(schema.vehicles).where(eq(schema.vehicles.id, id));
  revalidateVehicleViews();
}
