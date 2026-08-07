import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listBearers, listDrivers } from "@/lib/bearers";
import { listClients } from "@/lib/clients";
import { listVehicles } from "@/lib/vehicles";

import { createPractice } from "../actions";
import { PracticeForm } from "../practice-form";

export const metadata = { title: "Nuovo defunto — Documenti funebri" };

export const dynamic = "force-dynamic";

export default async function NuovoDefuntoPage() {
  const [clients, vehicles, drivers, bearers] = await Promise.all([
    listClients(),
    listVehicles(),
    listDrivers(),
    listBearers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuovo defunto</h1>
        <p className="text-muted-foreground text-sm">
          I dati del dichiarante e dell&apos;impresa arrivano dal cliente scelto
          qui sotto.
        </p>
      </div>

      {/* The form is hidden rather than shown alongside the alert: the client
          is required, so filling it in would end in an error on save. */}
      {clients.length === 0 ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Nessun cliente registrato</AlertTitle>
          <AlertDescription>
            <p>
              Serve un cliente per registrare un defunto: è chi presenta le
              domande e compare in tutti i documenti.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/clients/new">Aggiungi un cliente</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <PracticeForm
          action={createPractice}
          clients={clients}
          vehicles={vehicles}
          drivers={drivers}
          bearers={bearers}
          submitLabel="Crea scheda"
        />
      )}
    </div>
  );
}
