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
import type { Driver } from "@/lib/db/schema";

import { addDriver, type DriverFormState } from "./driver-actions";
import { DeleteDriverButton } from "./delete-driver-button";

export function DriversCard({ drivers }: { drivers: Driver[] }) {
  const [state, formAction, pending] = useActionState<DriverFormState, FormData>(
    addDriver,
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
        <CardTitle>Conducenti</CardTitle>
        <CardDescription>
          Chi guida l&apos;autofunebre: in ogni pratica scegli chi ha condotto
          il trasporto, e il nome finisce nel documento 4.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {drivers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-right">
                      <DeleteDriverButton driverId={d.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nessun conducente configurato. Aggiungine uno qui sotto: potrai poi
            sceglierlo in ogni pratica.
          </p>
        )}

        {/* Separate from the company-data form: nested forms are invalid HTML
            and the browser drops the inner one. */}
        <form
          ref={formRef}
          action={formAction}
          className="grid items-start gap-4 sm:grid-cols-[1fr_auto]"
        >
          {/* Not just "name": the vehicle card's input already uses it, and the
              e2e sweep over the settings inputs would match both. */}
          <Field
            name="driverName"
            label="Nome"
            placeholder="Es. Giuseppe Verdi"
            error={err("driverName")}
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
