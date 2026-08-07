import { notFound } from "next/navigation";

import { getClient } from "@/lib/clients";

import { updateClient } from "../actions";
import { ClientForm } from "../client-form";
import { DeleteClientButton } from "./delete-client-button";

export const dynamic = "force-dynamic";

/**
 * The id is a UUID, so it goes to the query as it arrives: there is no shape to
 * check. Anything that does not match a row is simply not found.
 */
async function loadClient(id: string) {
  const client = await getClient(id);
  if (!client) notFound();
  return client;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await loadClient(id);
  return { title: `${client.companyName} — Documenti funebri` };
}

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await loadClient(id);

  // The id is bound server-side so the client cannot change it.
  const action = updateClient.bind(null, client.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{client.companyName}</h1>
        <DeleteClientButton clientId={client.id} />
      </div>

      <ClientForm
        action={action}
        client={client}
        submitLabel="Salva modifiche"
      />
    </div>
  );
}
