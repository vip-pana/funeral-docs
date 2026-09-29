"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { useFormReset } from "@/lib/use-form-reset";

import {
  addBearer,
  type BearerFormState,
  setBearerContract,
  setBearerDriver,
  setBearerShoulderHeight,
} from "./bearer-actions";
import { DeleteBearerButton } from "./delete-bearer-button";
import { EditBearerDialog } from "./edit-bearer-dialog";

export function BearersCard({ bearers }: { bearers: Bearer[] }) {
  const [state, formAction, pending] = useActionState<BearerFormState, FormData>(
    addBearer,
    {},
  );
  const { ref: formRef, reset } = useFormReset();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Salvato.");
      // Without the reset the row just inserted stays in the form and invites
      // an identical second entry. Only here: after an error the name and the
      // Conducente tick keep what was chosen, see useFormReset.
      reset();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, reset]);

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
          Spunta Contratto per chi e&apos; assunto, a tempo determinato o
          indeterminato, e non a chiamata: nel calendario le sue ferie non
          danno punti.
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
                  <TableHead>Contratto</TableHead>
                  <TableHead>Altezza spalla (cm)</TableHead>
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
                    <TableCell>
                      <Checkbox
                        id={`bearerHasContract-${b.id}`}
                        aria-label={`${b.name}: contratto`}
                        checked={b.hasContract}
                        onCheckedChange={(on) =>
                          setBearerContract(b.id, on === true)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ShoulderHeightInput bearer={b} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <EditBearerDialog bearer={b} />
                        <DeleteBearerButton bearerId={b.id} />
                      </div>
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
          className="grid items-start gap-4 sm:grid-cols-[1fr_10rem_auto_auto_auto]"
        >
          {/* Not just "name": the other cards' inputs already use it, and the
              e2e sweep over the settings inputs would match them all. */}
          <Field
            name="bearerName"
            label="Nome"
            placeholder="Es. Paolo Neri"
            error={err("bearerName")}
          />
          <Field
            name="bearerShoulderHeight"
            label="Altezza spalla (cm)"
            type="number"
            inputMode="numeric"
            min={100}
            max={200}
            placeholder="Es. 145"
            error={err("bearerShoulderHeight")}
          />
          {/* Radix renders its own hidden input for `name`, which posts "on"
              when ticked and nothing at all when not. */}
          <label className="mt-[calc(--spacing(6)+2px)] flex h-9 items-center gap-2 text-sm whitespace-nowrap">
            <Checkbox id="bearerIsDriver" name="bearerIsDriver" />
            Conducente
          </label>
          <label className="mt-[calc(--spacing(6)+2px)] flex h-9 items-center gap-2 text-sm whitespace-nowrap">
            <Checkbox id="bearerHasContract" name="bearerHasContract" />
            Contratto
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

/**
 * Saved on blur, like the driver tick: one number per row, and a form here
 * would nest inside the add form below. An invalid value is reported and put
 * back to the saved one.
 */
function ShoulderHeightInput({ bearer }: { bearer: Bearer }) {
  const saved = bearer.shoulderHeight?.toString() ?? "";

  async function save(input: HTMLInputElement) {
    if (input.value.trim() === saved) return;
    const { error } = await setBearerShoulderHeight(bearer.id, input.value);
    if (error) {
      toast.error(error);
      input.value = saved;
    } else {
      toast.success("Altezza salvata.");
    }
  }

  return (
    <Input
      // Keyed on the saved value so a change from elsewhere resets the field.
      key={saved}
      type="number"
      inputMode="numeric"
      min={100}
      max={200}
      className="w-24"
      aria-label={`${bearer.name}: altezza alla spalla in cm`}
      defaultValue={saved}
      onBlur={(e) => save(e.currentTarget)}
    />
  );
}
