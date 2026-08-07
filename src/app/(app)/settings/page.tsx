import { listBearers } from "@/lib/bearers";
import { getOwner } from "@/lib/owner";
import { listVehicles } from "@/lib/vehicles";

import { BearersCard } from "./bearers-card";
import { OwnerForm } from "./owner-form";
import { VehiclesCard } from "./vehicles-card";

export const metadata = { title: "Impostazioni — Documenti funebri" };

// Values come from the database and change on save.
export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  const [owner, vehicles, bearers] = await Promise.all([
    getOwner(),
    listVehicles(),
    listBearers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-muted-foreground text-sm">
          Dati dell&apos;impresa funebre, ripresi in tutti i documenti.
        </p>
      </div>
      <OwnerForm owner={owner} />
      {/* After the company form, which has its own save button: placing them
          in between would suggest "Salva impostazioni" saves these lists too. */}
      <VehiclesCard vehicles={vehicles} />
      <BearersCard bearers={bearers} />
    </div>
  );
}
