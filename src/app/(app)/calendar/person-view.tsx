"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bearerLabel,
  type CalendarDay,
  type DayMark,
  markLabel,
  markSign,
  monthSummary,
  runningTotals,
  weekdayIndex,
} from "@/lib/calendar";
import type { Bearer } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { key } from "./calendar-grid";
import { DAY_FORMAT, MarkSheet, markTone, utc } from "./mark-menu";

const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];

/**
 * One bearer's month as an ordinary wall calendar, weeks from Monday: what a
 * phone has room for, and what is asked most often — how is this person's
 * month going.
 */
export function PersonView({
  bearers,
  bearerId,
  onBearerChange,
  calendar,
  marks,
  today,
  onChoose,
}: {
  bearers: Bearer[];
  bearerId: string;
  onBearerChange: (id: string) => void;
  calendar: CalendarDay[];
  marks: Map<string, DayMark>;
  today: string;
  onChoose: (bearerId: string, date: string, mark: DayMark | null) => void;
}) {
  const [openDay, setOpenDay] = useState<CalendarDay | null>(null);

  const index = Math.max(
    0,
    bearers.findIndex((b) => b.id === bearerId),
  );
  const bearer = bearers[index];
  const contract = bearer.hasContract;
  const rowMarks = calendar.map((d) => marks.get(key(bearer.id, d.date)));
  const totals = runningTotals(rowMarks, calendar, contract);
  const summary = monthSummary(rowMarks, calendar, contract);
  const step = (delta: number) =>
    onBearerChange(
      bearers[(index + delta + bearers.length) % bearers.length].id,
    );

  return (
    <div className="space-y-4">
      {/* Who: a menu for a jump, arrows to go through them one by one. */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Necroforo precedente"
          onClick={() => step(-1)}
          disabled={bearers.length < 2}
        >
          <ChevronLeftIcon />
        </Button>
        <Select value={bearer.id} onValueChange={onBearerChange}>
          <SelectTrigger
            aria-label="Necroforo"
            className="h-9 flex-1 font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bearers.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {bearerLabel(b)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          aria-label="Necroforo successivo"
          onClick={() => step(1)}
          disabled={bearers.length < 2}
        >
          <ChevronRightIcon />
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{bearer.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {bearer.shoulderHeight != null && (
                <Badge variant="outline">
                  {(bearer.shoulderHeight / 100).toFixed(2).replace(".", ",")} m
                </Badge>
              )}
              {bearer.isDriver && <Badge variant="secondary">Conducente</Badge>}
              <Badge variant={contract ? "default" : "outline"}>
                {contract ? "Contratto" : "A chiamata"}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-3xl leading-none font-bold tabular-nums"
              data-testid="person-total"
            >
              {summary.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              totale del mese
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Servizi" value={summary.services} />
          <Stat
            label={contract ? "Giorni di ferie" : "Punti ferie"}
            value={contract ? summary.ferieDays : summary.feriePoints}
            hint={contract ? "senza punti" : `${summary.ferieDays} gg`}
          />
          <Stat
            label="In festivi"
            value={summary.holidayServices}
            hint="non contano"
          />
        </dl>
      </div>

      <div>
        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w, i) => (
            <span
              key={i}
              className={cn(i === 6 && "text-[var(--calendar-sunday)]")}
            >
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: weekdayIndex(calendar[0].date) }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {calendar.map((d, j) => {
            const mark = rowMarks[j];
            const counts = mark && !(contract && mark.code === "F");
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setOpenDay(d)}
                aria-label={`${bearer.name}, ${DAY_FORMAT.format(utc(d.date))}: ${mark ? markLabel(mark, contract).toLowerCase() : "nulla segnato"}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors active:scale-95",
                  "hover:border-foreground/30",
                  d.isHoliday &&
                    "border-transparent bg-[var(--calendar-holiday)]",
                  markTone(mark),
                  d.date === today &&
                    "ring-2 ring-primary ring-offset-1 ring-offset-background",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1.5 text-[10px] leading-none font-medium",
                    d.isHoliday
                      ? "text-[var(--calendar-sunday)]"
                      : "text-muted-foreground",
                  )}
                >
                  {d.day}
                </span>
                <span className="font-mono text-base font-bold">
                  {mark ? markSign(mark, d.isHoliday, contract) : ""}
                </span>
                {counts && (
                  <span className="absolute right-1 bottom-0.5 text-[9px] leading-none opacity-70">
                    {totals[j]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tocca un giorno per segnarlo.{" "}
          {contract
            ? "Con il contratto le ferie non danno punti."
            : "Ferie: F1 con 48 ore di avviso, F2 con 24; nei festivi valgono il quadruplo."}{" "}
          Servizi: \ = 1, X = 2, \\\ = 3.
        </p>
      </div>

      <MarkSheet
        target={openDay && { bearer, day: openDay }}
        mark={openDay ? marks.get(key(bearer.id, openDay.date)) : undefined}
        onPick={(m) => {
          if (openDay) onChoose(bearer.id, openDay.date, m);
          setOpenDay(null);
        }}
        onClose={() => setOpenDay(null)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    // Label first for the markup, number first on screen.
    <div className="flex flex-col-reverse rounded-lg bg-muted/60 px-2 py-2">
      <dt className="text-[11px] leading-tight text-muted-foreground">
        {label}
        {hint && <span className="block opacity-80">{hint}</span>}
      </dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
