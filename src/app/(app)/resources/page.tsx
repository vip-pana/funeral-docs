import { listBearers } from "@/lib/bearers";
import { listVehicles } from "@/lib/vehicles";

import { BearersCard } from "./bearers-card";
import { VehiclesCard } from "./vehicles-card";

export const metadata = { title: "Risorse — Documenti funebri" };

// Values come from the database and change on save.
export const dynamic = "force-dynamic";

export default async function RisorsePage() {
  const [vehicles, bearers] = await Promise.all([
    listVehicles(),
    listBearers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Risorse</h1>
        <p className="text-muted-foreground text-sm">
          Mezzi e personale dell&apos;impresa, da scegliere per ogni defunto.
        </p>
      </div>
      <VehiclesCard vehicles={vehicles} />
      <BearersCard bearers={bearers} />
    </div>
  );
}
