import { eq } from "drizzle-orm";
import { TriangleAlertIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { db, schema } from "@/lib/db";
import { listDrivers } from "@/lib/drivers";
import { getOwner } from "@/lib/owner";
import { listVehicles } from "@/lib/vehicles";

import { updatePractice } from "../actions";
import { PracticeForm } from "../practice-form";
import { DeleteButton } from "./delete-button";
import { GeneratePanel } from "./generate-panel";

export const dynamic = "force-dynamic";

async function loadPractice(id: string) {
  const practiceId = Number(id);
  if (!Number.isInteger(practiceId)) notFound();

  const [row] = await db
    .select()
    .from(schema.practices)
    .where(eq(schema.practices.id, practiceId))
    .limit(1);

  if (!row) notFound();
  return row;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const practice = await loadPractice(id);
  return {
    title: `${practice.personLastName} ${practice.personFirstName} — Documenti funebri`,
  };
}

export default async function DefuntoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const practice = await loadPractice(id);
  const [owner, vehicles, drivers] = await Promise.all([
    getOwner(),
    listVehicles(),
    listDrivers(),
  ]);

  // The id is bound server-side so the client cannot change it.
  const action = updatePractice.bind(null, practice.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {practice.personLastName} {practice.personFirstName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Scheda n. {practice.id}
          </p>
        </div>
        <DeleteButton practiceId={practice.id} />
      </div>

      {!owner && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Impostazioni dell&apos;impresa mancanti</AlertTitle>
          <AlertDescription>
            I documenti uscirebbero senza i dati della ditta.
          </AlertDescription>
        </Alert>
      )}

      <GeneratePanel practiceId={practice.id} />

      <PracticeForm
        action={action}
        practice={practice}
        vehicles={vehicles}
        drivers={drivers}
        submitLabel="Salva modifiche"
      />
    </div>
  );
}
