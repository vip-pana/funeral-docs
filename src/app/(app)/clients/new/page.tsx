import { createClient } from "../actions";
import { ClientForm } from "../client-form";

export const metadata = { title: "Nuovo cliente — Documenti funebri" };

export default function NuovoClientePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuovo cliente</h1>
        <p className="text-muted-foreground text-sm">
          Dichiarante e impresa: questi dati finiscono in tutti i documenti dei
          defunti che lo indicano.
        </p>
      </div>

      <ClientForm action={createClient} submitLabel="Crea cliente" />
    </div>
  );
}
