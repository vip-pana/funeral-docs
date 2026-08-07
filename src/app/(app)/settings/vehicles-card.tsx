"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Vehicle } from "@/lib/db/schema";

import { addVehicle, type VehicleFormState } from "./vehicle-actions";
import { DeleteVehicleButton } from "./delete-vehicle-button";

export function VehiclesCard({ vehicles }: { vehicles: Vehicle[] }) {
  const [state, formAction, pending] = useActionState<VehicleFormState, FormData>(
    addVehicle,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Salvato.");
      // Without the reset the row just inserted stays in the form and invites
      // an identical second entry.
      formRef.current?.reset();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  const err = (name: string) => state.errors?.[name];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autofunebri</CardTitle>
        <CardDescription>
          I mezzi dell&apos;impresa: per ogni defunto scegli quale usare, e la
          targa finisce nei documenti.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {vehicles.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Targa</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.plate}</TableCell>
                    <TableCell className="text-right">
                      <DeleteVehicleButton vehicleId={v.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nessuna autofunebre configurata. Aggiungine una qui sotto: potrai
            poi sceglierla per ogni defunto.
          </p>
        )}

        {/* Separate from the company-data form: nested forms are invalid HTML
            and the browser drops the inner one. */}
        <form
          ref={formRef}
          action={formAction}
          className="grid items-start gap-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <Field
            name="name"
            label="Descrizione"
            placeholder="Es. Mercedes Vito"
            error={err("name")}
          />
          <Field
            name="plate"
            label="Targa"
            placeholder="Es. FG123AB"
            inputClassName="uppercase"
            error={err("plate")}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            // Drops down to the input's height, clearing the label above.
            className="mt-[calc(--spacing(6)+2px)] shrink-0"
          >
            {pending ? "Aggiunta…" : "Aggiungi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
