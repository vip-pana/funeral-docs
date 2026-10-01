"use client";

import { SearchIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  setBearerNote,
  setBearerShoulderHeight,
} from "./bearer-actions";
import { DeleteBearerButton } from "./delete-bearer-button";
import { EditBearerDialog } from "./edit-bearer-dialog";

/** Lowercase and without accents, so "nicolo" finds "Nicolò". */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function BearersCard({ bearers }: { bearers: Bearer[] }) {
  // Filtered here rather than through the URL like the records list: the
  // bearers are a few dozen and already all on the page.
  const [query, setQuery] = useState("");
  const shown = bearers.filter((b) =>
    fold(b.name).includes(fold(query.trim())),
  );

  const [state, formAction, pending] = useActionState<
    BearerFormState,
    FormData
  >(addBearer, {});
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
          indeterminato, e non a chiamata: nel calendario le sue ferie non danno
          punti. La nota compare in piccolo sotto il calendario, ma non nella
          stampa.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {bearers.length > 0 ? (
          <>
            <InputGroup className="max-w-md">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="bearerSearch"
                type="search"
                aria-label="Cerca fra i necrofori"
                placeholder="Cerca per nome…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </InputGroup>
            {shown.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nessun necroforo trovato per «{query.trim()}».
              </p>
            )}
            {/* On phones one card each: five columns do not fit, and the
                buttons ended up off screen. The boxes are wrapped in their
                labels, without the table's ids, which must stay unique. */}
            {/* Both hidden while the search finds nothing: an empty bordered
                box or a bare table header reads as a glitch. */}
            <ul
              className={
                shown.length ? "divide-y rounded-xl border md:hidden" : "hidden"
              }
            >
              {shown.map((b) => (
                <li key={b.id} className="space-y-2 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{b.name}</p>
                    <div className="flex shrink-0 gap-1">
                      <EditBearerDialog bearer={b} />
                      <DeleteBearerButton bearerId={b.id} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <label className="flex h-9 items-center gap-2">
                      <Checkbox
                        checked={b.isDriver}
                        onCheckedChange={(on) =>
                          setBearerDriver(b.id, on === true)
                        }
                      />
                      Conducente
                    </label>
                    <label className="flex h-9 items-center gap-2">
                      <Checkbox
                        checked={b.hasContract}
                        onCheckedChange={(on) =>
                          setBearerContract(b.id, on === true)
                        }
                      />
                      Contratto
                    </label>
                    <label className="flex items-center gap-2 text-muted-foreground">
                      Altezza
                      <ShoulderHeightInput bearer={b} />
                      cm
                    </label>
                  </div>
                  <NoteInput bearer={b} />
                </li>
              ))}
            </ul>
            <div
              className={
                shown.length ? "hidden overflow-x-auto md:block" : "hidden"
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Conducente</TableHead>
                    <TableHead>Contratto</TableHead>
                    <TableHead>Altezza spalla (cm)</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((b) => (
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
                      <TableCell className="min-w-56">
                        <NoteInput bearer={b} />
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
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
          {/* On a row of its own under name and height, but typed right after
              them. */}
          <Field
            name="bearerNote"
            label="Nota"
            maxLength={200}
            placeholder="Es. solo la mattina il sabato"
            className="sm:col-span-2 sm:col-start-1 sm:row-start-2"
            error={err("bearerNote")}
          />
          {/* Radix renders its own hidden input for `name`, which posts "on"
              when ticked and nothing at all when not. */}
          {/* Side by side on a phone; from sm up the wrapper dissolves and each
              box takes its own column. */}
          <div className="flex gap-6 sm:contents">
            <label className="flex h-9 items-center gap-2 text-sm whitespace-nowrap sm:mt-[calc(--spacing(6)+2px)]">
              <Checkbox id="bearerIsDriver" name="bearerIsDriver" />
              Conducente
            </label>
            <label className="flex h-9 items-center gap-2 text-sm whitespace-nowrap sm:mt-[calc(--spacing(6)+2px)]">
              <Checkbox id="bearerHasContract" name="bearerHasContract" />
              Contratto
            </label>
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            // Drops down to the input's height, clearing the label above.
            className="shrink-0 sm:mt-[calc(--spacing(6)+2px)]"
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

/** Saved on blur, like the shoulder height. */
function NoteInput({ bearer }: { bearer: Bearer }) {
  const saved = bearer.note;

  async function save(input: HTMLInputElement) {
    if (input.value.trim() === saved) return;
    const { error } = await setBearerNote(bearer.id, input.value);
    if (error) {
      toast.error(error);
      input.value = saved;
    } else {
      toast.success("Nota salvata.");
    }
  }

  return (
    <Input
      key={saved}
      maxLength={200}
      placeholder="Nota…"
      aria-label={`${bearer.name}: nota`}
      defaultValue={saved}
      onBlur={(e) => save(e.currentTarget)}
    />
  );
}
