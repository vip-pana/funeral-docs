"use client";

import { startTransition, useOptimistic, useState } from "react";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  bearerLabel,
  DAY_MARKS,
  type DayMark,
  daysOfMonth,
  markLabel,
  markSign,
  monthLabel,
  runningTotals,
  sameMark,
  toMark,
} from "@/lib/calendar";
import type { Bearer, BearerDay } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { setDay } from "./actions";

const key = (bearerId: string, date: string) => `${bearerId}|${date}`;

const DAY_FORMAT = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * The month as the paper sheet lays it out: a yellow heading with the days,
 * Sundays in red, one shaded row per bearer. The colours are classes in
 * globals.css because print has to force them back to the light version.
 */
export function CalendarGrid({
  month,
  bearers,
  days,
}: {
  month: string;
  bearers: Bearer[];
  days: BearerDay[];
}) {
  const [marks, applyMark] = useOptimistic(
    new Map(
      days.flatMap((d) => {
        const mark = toMark(d);
        return mark ? [[key(d.bearerId, d.date), mark] as const] : [];
      }),
    ),
    (current, change: { k: string; mark: DayMark | null }) => {
      const next = new Map(current);
      if (change.mark) next.set(change.k, change.mark);
      else next.delete(change.k);
      return next;
    },
  );
  // One menu open at a time, so the grid tracks which cell has it.
  const [openCell, setOpenCell] = useState<string | null>(null);

  const calendar = daysOfMonth(month);

  function choose(bearerId: string, date: string, mark: DayMark | null) {
    setOpenCell(null);
    startTransition(async () => {
      applyMark({ k: key(bearerId, date), mark });
      const { error } = await setDay(bearerId, date, mark);
      if (error) toast.error(error);
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="calendar w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col className="w-36" />
          <col className="w-10" />
          {calendar.map((d) => (
            <col key={d.day} />
          ))}
        </colgroup>
        <thead>
          <tr className="calendar-head">
            <th className="calendar-sunday px-1.5 py-1.5 text-left font-semibold">
              {monthLabel(month)}
            </th>
            <th className="py-1.5 text-center font-semibold" title="Servizi del mese">
              Tot.
            </th>
            {calendar.map((d) => (
              <th
                key={d.day}
                className={cn(
                  "py-1.5 text-center font-semibold",
                  d.isHoliday && "calendar-sunday",
                )}
              >
                {d.day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bearers.map((b, i) => {
            const rowMarks = calendar.map((d) => marks.get(key(b.id, d.date)));
            const totals = runningTotals(rowMarks, calendar);
            return (
              <tr
                key={b.id}
                className={i % 2 ? "calendar-row-even" : "calendar-row-odd"}
              >
                <th
                  scope="row"
                  className="truncate px-1.5 py-1 text-left font-semibold"
                >
                  {bearerLabel(b)}
                </th>
                <td className="text-center font-bold">
                  {totals.at(-1) || ""}
                </td>
                {calendar.map((d, j) => {
                  const k = key(b.id, d.date);
                  const mark = rowMarks[j];
                  const day = DAY_FORMAT.format(new Date(`${d.date}T00:00:00Z`));
                  return (
                    <td
                      key={d.day}
                      className={cn("p-0", d.isHoliday && "calendar-holiday")}
                    >
                      <Popover
                        open={openCell === k}
                        onOpenChange={(open) => setOpenCell(open ? k : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${b.name}, ${day}: ${mark ? markLabel(mark).toLowerCase() : "nulla segnato"}`}
                            className="hover:bg-foreground/10 relative block h-6 w-full font-bold whitespace-nowrap"
                          >
                            {mark ? markSign(mark, d.isHoliday) : ""}
                            {/* The month's total so far, in the corner. */}
                            {mark && (
                              <span className="absolute right-0.5 bottom-0 text-[8px] leading-none font-medium">
                                {totals[j]}
                              </span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 gap-0 p-1" align="start">
                          <p className="text-muted-foreground px-2 py-1 text-xs">
                            {b.name}, {day}
                          </p>
                          {DAY_MARKS.map((m) => (
                            <button
                              key={markLabel(m)}
                              type="button"
                              aria-pressed={sameMark(mark, m)}
                              onClick={() => choose(b.id, d.date, m)}
                              className="hover:bg-accent aria-pressed:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm"
                            >
                              {markLabel(m)}
                              <span className="font-mono font-bold">
                                {markSign(m, d.isHoliday)}
                              </span>
                            </button>
                          ))}
                          <div className="bg-border my-1 h-px" />
                          <button
                            type="button"
                            disabled={!mark}
                            onClick={() => choose(b.id, d.date, null)}
                            className="hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm disabled:opacity-50"
                          >
                            Svuota
                          </button>
                        </PopoverContent>
                      </Popover>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 flex flex-wrap gap-x-8 border-t pt-1 text-[10px] font-medium uppercase">
        <span>Ferie avviso 48 ore = F1 (festivo F4)</span>
        <span>Ferie avviso 24 ore = F2 (festivo F8)</span>
        {DAY_MARKS.filter((m) => m.code === "L").map((m) => (
          <span key={markLabel(m)}>
            {markLabel(m)} = {markSign(m, false)}
          </span>
        ))}
        <span>Servizi di domeniche e festivi non contano nel totale</span>
      </p>
    </div>
  );
}
