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
 * Copia la targa dal veicolo scelto.
 *
 * Il veicolo si rilegge dal database invece di fidarsi di un valore inviato
 * dal client: la targa finisce in un documento ufficiale. Da qui in poi la
 * pratica non dipende piu' dall'elenco, e cancellare l'autofunebre non cambia
 * i documenti gia' emessi.
 */
async function withVehiclePlate(data: PracticeInput) {
  const vehicle = data.vehicleId ? await getVehicle(data.vehicleId) : null;
  return {
    ...data,
    // Un id inesistente diventa null: passarlo com'e' violerebbe la chiave
    // esterna e farebbe fallire l'inserimento con un errore grezzo.
    vehicleId: vehicle?.id ?? null,
    // Deselezionare il mezzo azzera la targa: l'utente sta dicendo "nessuna
    // autofunebre". Cambiarlo la aggiorna, altrimenti il campo sarebbe
    // ingannevole — lo modifichi e non succede nulla.
    vehiclePlate: vehicle?.plate ?? "",
  };
}

function collectErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    // Un solo messaggio per campo: il form ne mostra uno alla volta.
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Crea una pratica e apre subito la sua pagina. */
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
  // Fuori dal try/catch: redirect() segnala l'uscita lanciando un'eccezione
  // che Next intercetta, e un catch attorno la scambierebbe per un errore.
  redirect(`/pratiche/${row.id}`);
}

/** Aggiorna una pratica esistente. */
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
