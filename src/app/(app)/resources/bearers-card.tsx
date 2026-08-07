"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Bearer } from "@/lib/db/schema";

import {
  addBearer,
  type BearerFormState,
  setBearerDriver,
} from "./bearer-actions";
import { DeleteBearerButton } from "./delete-bearer-button";

export function BearersCard({ bearers }: { bearers: Bearer[] }) {
  const [state, formAction, pending] = useActionState<BearerFormState, FormData>(
    addBearer,
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
        <CardTitle>Necrofori</CardTitle>
        <CardDescription>
          Chi porta il feretro: per ogni defunto scegli quali hanno prestato
          servizio, e i nomi finiscono nel documento 7. Spunta Conducente per
          chi puo&apos; anche guidare l&apos;autofunebre: solo loro compaiono
          nella scelta del conducente, il cui nome finisce nel documento 4.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {bearers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Conducente</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bearers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>
                      {/* Saved on the spot rather than behind a submit: it is a
                          single flag, and a form here would nest inside the one
                          below. */}
                      <Checkbox
                        id={`bearerIsDriver-${b.id}`}
                        aria-label={`${b.name}: conducente`}
                        checked={b.isDriver}
                        onCheckedChange={(on) =>
                          setBearerDriver(b.id, on === true)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteBearerButton bearerId={b.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nessun necroforo configurato. Aggiungine uno qui sotto: potrai poi
            sceglierli per ogni defunto.
          </p>
        )}

        {/* Separate from the company-data form: nested forms are invalid HTML
            and the browser drops the inner one. */}
        <form
          ref={formRef}
          action={formAction}
          className="grid items-start gap-4 sm:grid-cols-[1fr_auto_auto]"
        >
          {/* Not just "name": the other cards' inputs already use it, and the
              e2e sweep over the settings inputs would match them all. */}
          <Field
            name="bearerName"
            label="Nome"
            placeholder="Es. Paolo Neri"
            error={err("bearerName")}
          />
          {/* Radix renders its own hidden input for `name`, which posts "on"
              when ticked and nothing at all when not. */}
          <label className="mt-[calc(--spacing(6)+2px)] flex h-9 items-center gap-2 text-sm whitespace-nowrap">
            <Checkbox id="bearerIsDriver" name="bearerIsDriver" />
            Conducente
          </label>
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
