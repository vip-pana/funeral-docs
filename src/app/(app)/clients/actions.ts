"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clientNameOf } from "@/lib/client-name";
import { db, schema } from "@/lib/db";
import { collectErrors } from "@/lib/form-errors";
import { clientSchema } from "@/lib/validation";

export type ClientFormState = {
  errors?: Record<string, string>;
  message?: string;
};

function revalidateClientViews() {
  revalidatePath("/clients");
  // The second argument matters: without it /deceased/new and /deceased/[id]
  // would keep the stale list in their Select.
  revalidatePath("/deceased", "layout");
}

/** Creates a client and opens its page straight away. */
export async function createClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues),
      message: "Controlla i campi segnalati.",
    };
  }

  const [row] = await db
    .insert(schema.clients)
    .values(parsed.data)
    .returning({ id: schema.clients.id });

  revalidateClientViews();
  // Outside any try/catch: redirect() signals by throwing an exception that
  // Next intercepts, and a catch around it would mistake that for an error.
  redirect(`/clients/${row.id}`);
}

export async function updateClient(
  id: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues),
      message: "Controlla i campi segnalati.",
    };
  }

  await db
    .update(schema.clients)
    .set({
      ...parsed.data,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(eq(schema.clients.id, id));

  // The name is copied onto every record that picked this client, so a renamed
  // client would otherwise still show the old name in the list.
  await db
    .update(schema.practices)
    .set({ clientName: clientNameOf(parsed.data) })
    .where(eq(schema.practices.clientId, id));

  revalidateClientViews();
  return { message: "Cliente aggiornato." };
}

export async function deleteClient(id: string) {
  // Records that used it keep the copied name: the reference nulls itself out
  // (ON DELETE SET NULL) and the record stays editable. Their documents come
  // out without the declarant until another client is picked.
  await db.delete(schema.clients).where(eq(schema.clients.id, id));
  revalidateClientViews();
  redirect("/clients");
}
