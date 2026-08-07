import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listBearers } from "@/lib/bearers";
import { listDrivers } from "@/lib/drivers";
import { getOwner } from "@/lib/owner";
import { listVehicles } from "@/lib/vehicles";

import { createPractice } from "../actions";
import { PracticeForm } from "../practice-form";

export const metadata = { title: "Nuovo defunto — Documenti funebri" };

export const dynamic = "force-dynamic";

export default async function NuovoDefuntoPage() {
  const [owner, vehicles, drivers, bearers] = await Promise.all([
    getOwner(),
    listVehicles(),
    listDrivers(),
    listBearers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuovo defunto</h1>
        <p className="text-muted-foreground text-sm">
          I dati dell&apos;impresa vengono presi dalle impostazioni.
        </p>
      </div>

      {!owner && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Impostazioni dell&apos;impresa mancanti</AlertTitle>
          <AlertDescription>
            <p>I documenti generati resterebbero senza i dati della ditta.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/settings">Compila le impostazioni</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <PracticeForm
        action={createPractice}
        vehicles={vehicles}
        drivers={drivers}
        bearers={bearers}
        submitLabel="Crea scheda"
      />
    </div>
  );
}
