import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listDrivers } from "@/lib/drivers";
import { getOwner } from "@/lib/owner";
import { listVehicles } from "@/lib/vehicles";

import { createPractice } from "../actions";
import { PracticeForm } from "../practice-form";

export const metadata = { title: "Nuova pratica — Documenti funebri" };

export const dynamic = "force-dynamic";

export default async function NuovaPraticaPage() {
  const [owner, vehicles, drivers] = await Promise.all([
    getOwner(),
    listVehicles(),
    listDrivers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuova pratica</h1>
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
              <Link href="/impostazioni">Compila le impostazioni</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <PracticeForm
        action={createPractice}
        vehicles={vehicles}
        drivers={drivers}
        submitLabel="Crea pratica"
      />
    </div>
  );
}
