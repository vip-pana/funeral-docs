"use client";

import { useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  bearerLabel,
  type CalendarDay,
  DAY_MARKS,
  type DayMark,
  markLabel,
  markSign,
  monthLabel,
  runningTotals,
} from "@/lib/calendar";
import type { Bearer } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { DAY_FORMAT, MarkOptions, utc } from "./mark-menu";

export const key = (bearerId: string, date: string) => `${bearerId}|${date}`;

/**
 * The month as the paper sheet lays it out: a yellow heading with the days,
 * Sundays in red, one shaded row per bearer. The colours are classes in
 * globals.css because print has to force them back to the light version.
 *
 * Narrower than the month, the days scroll sideways under the name and the
 * total, which stay put.
 */
export function CalendarGrid({
  month,
  bearers,
  calendar,
  marks,
  today,
  onChoose,
}: {
  month: string;
  bearers: Bearer[];
  calendar: CalendarDay[];
  marks: Map<string, DayMark>;
  today: string;
  onChoose: (bearerId: string, date: string, mark: DayMark | null) => void;
}) {
  // One menu open at a time, so the grid tracks which cell has it.
  const [openCell, setOpenCell] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Opens on today when the month does not fit: the days that matter are
  // the recent ones, not the 1st.
  useEffect(() => {
    const box = scroller.current;
    const cell = box?.querySelector<HTMLElement>("[data-today]");
    if (!box || !cell || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = cell.offsetLeft - box.clientWidth / 2;
  }, []);

  function choose(bearerId: string, date: string, mark: DayMark | null) {
    setOpenCell(null);
    onChoose(bearerId, date, mark);
  }

  return (
    <div>
      <div ref={scroller} className="overflow-x-auto overscroll-x-contain print:overflow-visible">
        <table className="calendar w-full min-w-[58rem] table-fixed text-xs print:min-w-0">
          <colgroup>
            <col className="w-36" />
            <col className="w-10" />
            {calendar.map((d) => (
              <col key={d.day} />
            ))}
          </colgroup>
          <thead>
            <tr className="calendar-head">
              <th className="calendar-sunday sticky left-0 z-10 bg-inherit px-1.5 py-1.5 text-left font-semibold print:static">
                {monthLabel(month)}
              </th>
              <th
                className="sticky left-36 z-10 bg-inherit py-1.5 text-center font-semibold print:static"
                title="Servizi del mese"
              >
                Tot.
              </th>
              {calendar.map((d) => (
                <th
                  key={d.day}
                  data-today={d.date === today || undefined}
                  className={cn(
                    "py-1.5 text-center font-semibold",
                    d.isHoliday && "calendar-sunday",
                    d.date === today && "underline decoration-2 underline-offset-2 print:no-underline",
                  )}
                >
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bearers.map((b, i) => {
              const contract = b.hasContract;
              const rowMarks = calendar.map((d) => marks.get(key(b.id, d.date)));
              const totals = runningTotals(rowMarks, calendar, contract);
              return (
                <tr
                  key={b.id}
                  className={i % 2 ? "calendar-row-even" : "calendar-row-odd"}
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 truncate bg-inherit px-1.5 py-1 text-left font-semibold print:static"
                  >
                    {bearerLabel(b)}
                  </th>
                  <td className="sticky left-36 z-10 bg-inherit text-center font-bold print:static">
                    {totals.at(-1) || ""}
                  </td>
                  {calendar.map((d, j) => {
                    const k = key(b.id, d.date);
                    const mark = rowMarks[j];
                    // No points to show in the corner of a contract's ferie.
                    const showTotal = mark && !(contract && mark.code === "F");
                    const day = DAY_FORMAT.format(utc(d.date));
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
                              aria-label={`${b.name}, ${day}: ${mark ? markLabel(mark, contract).toLowerCase() : "nulla segnato"}`}
                              className="hover:bg-foreground/10 relative block h-7 w-full font-bold whitespace-nowrap print:h-6"
                            >
                              {mark ? markSign(mark, d.isHoliday, contract) : ""}
                              {/* The month's total so far, in the corner. */}
                              {showTotal && (
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
                            <MarkOptions
                              bearer={b}
                              day={d}
                              mark={mark}
                              onPick={(m) => choose(b.id, d.date, m)}
                            />
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
      </div>
      <p className="mt-1 flex flex-wrap gap-x-8 gap-y-0.5 border-t pt-1 text-[10px] font-medium uppercase">
        <span>Ferie avviso 48 ore = F1 (festivo F4)</span>
        <span>Ferie avviso 24 ore = F2 (festivo F8)</span>
        <span>Necrofori con contratto: ferie = F, senza punti</span>
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
