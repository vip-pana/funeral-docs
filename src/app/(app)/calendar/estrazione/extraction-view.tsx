"use client";

import { PencilIcon, RotateCcwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field as FieldRoot,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bearerLabel, type DayMark } from "@/lib/calendar";
import type { Bearer } from "@/lib/db/schema";
import { availability, type Availability, rankTeams } from "@/lib/extraction";
import { cn } from "@/lib/utils";

import { addService } from "../actions";
import { DAY_FORMAT, utc } from "../mark-menu";

export type ExtractionRow = {
  bearer: Bearer;
  /** The month's total up to the funeral's day, that day included. */
  total: number;
  /** What the chosen day already holds. */
  mark: DayMark | undefined;
};

const metres = (cm: number) => (cm / 100).toFixed(2).replace(".", ",");

/**
 * The proposal and the hand-made corrections. Until a box is touched the
 * ticks follow the proposal, which moves with the number and the tolerance;
 * once one is touched they are the user's. "Ricalcola" hands them back to
 * the proposal and, pressed again, moves on to the next one: the same
 * fairness with other people first, then the next fairest.
 */
export function ExtractionView({
  date,
  back,
  rows,
}: {
  date: string;
  /** Where "Torna al calendario" leads, kept when the date changes. */
  back: string | undefined;
  rows: ExtractionRow[];
}) {
  const router = useRouter();
  const [size, setSize] = useState(4);
  const [tolerance, setTolerance] = useState(3);
  const [manual, setManual] = useState<string[] | null>(null);
  // Which of the ranked proposals is on screen.
  const [variant, setVariant] = useState(0);
  const [pending, startTransition] = useTransition();

  const status = new Map(rows.map((r) => [r.bearer.id, availability(r.mark)]));
  const candidates = rows
    .filter(
      (r) =>
        status.get(r.bearer.id)!.available && r.bearer.shoulderHeight != null,
    )
    .map((r) => ({
      id: r.bearer.id,
      height: r.bearer.shoulderHeight!,
      total: r.total,
    }));
  // Ranked once per input rather than on every tick of a box.
  const key = JSON.stringify(candidates);
  const teams = useMemo(
    () => rankTeams(JSON.parse(key), size, tolerance),
    [key, size, tolerance],
  );
  const team = teams[variant % teams.length];
  const selected = manual ?? team.ids;

  // Tallest first, as on the sheet; those without a height last.
  const sorted = [...rows].sort(
    (a, b) =>
      (b.bearer.shoulderHeight ?? -1) - (a.bearer.shoulderHeight ?? -1) ||
      a.bearer.name.localeCompare(b.bearer.name, "it"),
  );
  const picked = sorted.filter((r) => selected.includes(r.bearer.id));

  const heights = picked
    .map((r) => r.bearer.shoulderHeight)
    .filter((h): h is number => h != null);
  const day = DAY_FORMAT.format(utc(date));

  function pick(ids: string[]) {
    const same =
      ids.length === selected.length &&
      ids.every((id) => selected.includes(id));
    if (!same) setManual(ids);
  }

  function confirm() {
    startTransition(async () => {
      const result = await addService(date, selected);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.added?.length) {
        toast.success(`Servizio segnato il ${day}: ${result.added.join(", ")}`);
      }
      if (result.skipped?.length) {
        toast.warning(`Non segnati: ${result.skipped.join(", ")}`);
      }
      // The totals have moved: the next proposal starts from them.
      setManual(null);
      setVariant(0);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <FieldRoot>
          <FieldLabel htmlFor="extractionDate">Data del funerale</FieldLabel>
          <Input
            id="extractionDate"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                const next = new URLSearchParams({ date: e.target.value });
                if (back) next.set("back", back);
                router.push(`/calendar/estrazione?${next}`);
              }
            }}
          />
        </FieldRoot>
        <FieldRoot>
          <FieldLabel htmlFor="extractionSize">Necrofori</FieldLabel>
          <Input
            id="extractionSize"
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            value={size}
            onChange={(e) => {
              setSize(Math.max(1, Math.min(12, Number(e.target.value) || 1)));
              setManual(null);
              setVariant(0);
            }}
          />
        </FieldRoot>
        <FieldRoot>
          <FieldLabel htmlFor="extractionTolerance">
            Differenza di altezza (cm)
          </FieldLabel>
          <Input
            id="extractionTolerance"
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            value={tolerance}
            onChange={(e) => {
              setTolerance(
                Math.max(0, Math.min(30, Number(e.target.value) || 0)),
              );
              setManual(null);
              setVariant(0);
            }}
          />
          <FieldDescription>Tra il più alto e il più basso</FieldDescription>
        </FieldRoot>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3"
        data-testid="extraction-summary"
      >
        <div className="space-y-0.5 text-sm">
          <p className="font-medium">
            {picked.length} scelt{picked.length === 1 ? "o" : "i"}
            {heights.length > 0 &&
              ` · altezza ${metres(Math.min(...heights))}–${metres(Math.max(...heights))}`}
            {picked.length > 0 &&
              ` · Tot. ${picked.map((r) => r.total).join("+")}`}
          </p>
          {manual === null && team.widened && candidates.length > 0 && (
            <p className="text-amber-700 dark:text-amber-400">
              Nessun gruppo entro {tolerance} cm: proposti i più vicini (
              {team.spread} cm).
            </p>
          )}
          {picked.length !== size && (
            <p className="text-amber-700 dark:text-amber-400">
              Ne servono {size}.
            </p>
          )}
          {manual !== null ? (
            <p className="text-muted-foreground">Scelta modificata a mano.</p>
          ) : (
            <p className="text-muted-foreground">
              {teams.length > 1
                ? `Proposta ${(variant % teams.length) + 1} di ${teams.length}`
                : "Nessun'altra proposta possibile"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PickDialog
            rows={sorted}
            status={status}
            selected={selected}
            size={size}
            date={date}
            day={day}
            onConfirm={pick}
          />
          <Button
            variant="outline"
            onClick={() => {
              // After a hand-made change, back to the proposal on screen;
              // otherwise on to the next one, round again after the last.
              if (manual === null) setVariant((v) => (v + 1) % teams.length);
              setManual(null);
            }}
          >
            <RotateCcwIcon />
            Ricalcola proposta
          </Button>
          <Button disabled={pending || picked.length === 0} onClick={confirm}>
            {pending ? "Salvataggio…" : `Segna il servizio il ${day}`}
          </Button>
        </div>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="extraction-picked"
      >
        {picked.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-full">
            Nessun necroforo scelto: aggiungili con Modifica.
          </p>
        ) : (
          picked.map(({ bearer, total }) => {
            const s = status.get(bearer.id)!;
            const note = s.available ? s.note : undefined;
            return (
              <div
                key={bearer.id}
                data-bearer={bearer.id}
                className="space-y-1 rounded-xl border bg-card px-4 py-3"
              >
                <p className="font-medium">{bearerLabel(bearer)}</p>
                <p className="text-sm text-muted-foreground">
                  {bearer.shoulderHeight == null
                    ? "altezza mancante"
                    : `altezza ${metres(bearer.shoulderHeight)}`}
                  {` · Tot. al ${Number(date.slice(8))}: ${total}`}
                </p>
                {note && <p className="text-sm">{note}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * The full list, to correct the proposal by hand. The ticks are a draft until
 * Conferma: closing the dialog any other way leaves the choice as it was.
 */
function PickDialog({
  rows,
  status,
  selected,
  size,
  date,
  day,
  onConfirm,
}: {
  rows: ExtractionRow[];
  status: Map<string, Availability>;
  selected: string[];
  size: number;
  date: string;
  day: string;
  onConfirm: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilIcon />
          Modifica
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Necrofori del {day}</DialogTitle>
          <DialogDescription>
            Spunta chi va al funerale, poi conferma.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the current
            choice. */}
        {open && (
          <PickList
            rows={rows}
            status={status}
            selected={selected}
            size={size}
            date={date}
            day={day}
            onConfirm={(ids) => {
              onConfirm(ids);
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickList({
  rows,
  status,
  selected,
  size,
  date,
  day,
  onConfirm,
}: {
  rows: ExtractionRow[];
  status: Map<string, Availability>;
  selected: string[];
  size: number;
  date: string;
  day: string;
  onConfirm: (ids: string[]) => void;
}) {
  const [draft, setDraft] = useState(selected);

  function toggle(id: string, on: boolean) {
    setDraft(on ? [...draft, id] : draft.filter((other) => other !== id));
  }

  return (
    <>
      <p
        className={cn(
          "text-sm font-medium",
          draft.length !== size && "text-amber-700 dark:text-amber-400",
        )}
      >
        {draft.length} scelt{draft.length === 1 ? "o" : "i"} · ne servono {size}
      </p>
      <div className="max-h-[60vh] overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Necroforo</TableHead>
              <TableHead
                className="text-right"
                title={`Totale del mese fino al ${day}`}
              >
                Tot. al {Number(date.slice(8))}
              </TableHead>
              <TableHead>Il {day}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ bearer, total }) => {
              const s = status.get(bearer.id)!;
              const on = draft.includes(bearer.id);
              return (
                <TableRow
                  key={bearer.id}
                  data-bearer={bearer.id}
                  data-state={on ? "selected" : undefined}
                  className={cn(!s.available && "text-muted-foreground")}
                >
                  <TableCell>
                    {s.available && (
                      <Checkbox
                        aria-label={`Scegli ${bearer.name}`}
                        checked={on}
                        onCheckedChange={(v) => toggle(bearer.id, v === true)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {bearerLabel(bearer)}
                    {bearer.shoulderHeight == null && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        altezza mancante
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {total}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.available
                      ? (s.note ?? "Libero")
                      : `Non disponibile: ${s.reason}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Annulla</Button>
        </DialogClose>
        <Button onClick={() => onConfirm(draft)}>Conferma</Button>
      </DialogFooter>
    </>
  );
}
