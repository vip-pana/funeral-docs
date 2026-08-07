import { getOwner } from "@/lib/owner";
import { listVehicles } from "@/lib/vehicles";

import { OwnerForm } from "./owner-form";
import { VehiclesCard } from "./vehicles-card";

export const metadata = { title: "Impostazioni — Documenti funebri" };

// I valori arrivano dal database e cambiano al salvataggio.
export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const [owner, vehicles] = await Promise.all([getOwner(), listVehicles()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-muted-foreground text-sm">
          Dati dell&apos;impresa funebre, ripresi in tutti i documenti.
        </p>
      </div>
      <OwnerForm owner={owner} />
      {/* Dopo il form della ditta, che ha il proprio pulsante di salvataggio:
          in mezzo suggerirebbe che "Salva impostazioni" salvi anche i mezzi. */}
      <VehiclesCard vehicles={vehicles} />
    </div>
  );
}
