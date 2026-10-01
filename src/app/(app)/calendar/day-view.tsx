"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  bearerLabel,
  type CalendarDay,
  type DayMark,
  markLabel,
  serviceTotal,
  totalUpTo,
} from "@/lib/calendar";
import type { Bearer } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { key } from "./calendar-grid";
import {
  LONG_DAY_FORMAT,
  MarkGlyph,
  MarkSheet,
  markTone,
  utc,
} from "./mark-menu";

const WEEKDAY = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  timeZone: "UTC",
});

/**
 * One day for every bearer: for filling in what happened today. The days of
 * the month run along the top and scroll sideways.
 */
export function DayView({
  bearers,
  calendar,
  day,
  onDayChange,
  marks,
  today,
  onChoose,
}: {
  bearers: Bearer[];
  calendar: CalendarDay[];
  day: number;
  onDayChange: (day: number) => void;
  marks: Map<string, DayMark>;
  today: string;
  onChoose: (bearerId: string, date: string, mark: DayMark | null) => void;
}) {
  const [openBearer, setOpenBearer] = useState<Bearer | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  const current = calendar[Math.min(day, calendar.length) - 1];

  useEffect(() => {
    strip.current
      ?.querySelector<HTMLElement>("[aria-current=date]")
      ?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
  }, [day]);

  const onDay = bearers.map((b) => marks.get(key(b.id, current.date)));
  const onLeave = onDay.filter((m) => m?.code === "F").length;
  const services = onDay.reduce(
    (n, m) => n + (m?.code === "L" ? m.services : 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div
        ref={strip}
        className="-mx-4 flex snap-x [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {calendar.map((d) => {
          const busy = bearers.some((b) => marks.has(key(b.id, d.date)));
          const selected = d.day === current.day;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => onDayChange(d.day)}
              aria-current={selected ? "date" : undefined}
              aria-label={LONG_DAY_FORMAT.format(utc(d.date))}
              className={cn(
                "relative flex w-12 shrink-0 snap-center flex-col items-center rounded-xl border py-2 transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
                !selected &&
                  d.isHoliday &&
                  "border-transparent bg-[var(--calendar-holiday)]",
                !selected &&
                  d.date === today &&
                  "border-primary bg-primary/15 font-semibold",
              )}
            >
              <span
                className={cn(
                  "text-[10px] uppercase",
                  !selected &&
                    (d.isHoliday
                      ? "text-[var(--calendar-sunday)]"
                      : "text-muted-foreground"),
                )}
              >
                {WEEKDAY.format(utc(d.date)).replace(".", "")}
              </span>
              <span className="text-lg leading-tight font-semibold">
                {d.day}
              </span>
              <span
                className={cn(
                  "size-1 rounded-full",
                  busy
                    ? selected
                      ? "bg-primary-foreground"
                      : "bg-primary"
                    : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Giorno precedente"
          disabled={current.day === 1}
          onClick={() => onDayChange(current.day - 1)}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-semibold first-letter:uppercase">
            {LONG_DAY_FORMAT.format(utc(current.date))}
          </p>
          <p className="text-xs text-muted-foreground">
            {current.isHoliday && "Festivo, i servizi non contano · "}
            {onLeave} in ferie · {services}{" "}
            {services === 1 ? "servizio" : "servizi"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Giorno successivo"
          disabled={current.day === calendar.length}
          onClick={() => onDayChange(current.day + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border">
        {bearers.map((b, i) => {
          const mark = onDay[i];
          const contract = b.hasContract;
          const rowMarks = calendar.map((d) => marks.get(key(b.id, d.date)));
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setOpenBearer(b)}
                aria-label={`${b.name}: ${mark ? markLabel(mark, contract).toLowerCase() : "nulla segnato"}`}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent active:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{bearerLabel(b)}</p>
                  <p className="text-xs text-muted-foreground">
                    {mark ? markLabel(mark, contract) : "Nulla segnato"}
                    {contract && (
                      <Badge
                        variant="outline"
                        className="ml-2 h-4 px-1 text-[10px]"
                      >
                        Contratto
                      </Badge>
                    )}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex h-9 min-w-11 items-center justify-center rounded-lg px-2 font-mono font-bold",
                    mark
                      ? markTone(mark)
                      : "border border-dashed text-muted-foreground",
                  )}
                >
                  {mark ? (
                    <MarkGlyph
                      mark={mark}
                      isHoliday={current.isHoliday}
                      hasContract={contract}
                    />
                  ) : (
                    "+"
                  )}
                </span>
                {/* Up to the day on screen, what deciding who works goes by;
                    the month's total, ferie to come included, beside it. */}
                <span
                  className="w-12 text-right"
                  title={`Totale fino al ${current.day}`}
                >
                  <span
                    className="block text-sm font-semibold tabular-nums"
                    data-testid="day-total"
                  >
                    {totalUpTo(rowMarks, calendar, current.date, contract)}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    al {current.day}
                  </span>
                </span>
                <span
                  className="w-10 text-right text-muted-foreground"
                  title="Totale del mese"
                >
                  <span className="block text-sm tabular-nums">
                    {serviceTotal(rowMarks, calendar, contract)}
                  </span>
                  <span className="block text-[10px]">mese</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <MarkSheet
        target={openBearer && { bearer: openBearer, day: current }}
        mark={
          openBearer ? marks.get(key(openBearer.id, current.date)) : undefined
        }
        onPick={(m, keepOpen) => {
          if (openBearer) onChoose(openBearer.id, current.date, m);
          if (!keepOpen) setOpenBearer(null);
        }}
        onClose={() => setOpenBearer(null)}
      />
    </div>
  );
}
