"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Grid3x3Icon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { startTransition, useOptimistic, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  type DayMark,
  daysOfMonth,
  monthLabel,
  shiftMonth,
  todayIso,
  toMark,
} from "@/lib/calendar";
import type { Bearer, BearerDay } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { setDay } from "./actions";
import { CalendarGrid, key } from "./calendar-grid";
import { DayView } from "./day-view";
import { PersonView } from "./person-view";
import { PrintButton } from "./print-button";

export type CalendarMode = "persona" | "giorno" | "mese";

const MODES: { mode: CalendarMode; label: string; icon: typeof UserIcon }[] = [
  { mode: "persona", label: "Necroforo", icon: UserIcon },
  { mode: "giorno", label: "Giorno", icon: CalendarDaysIcon },
  { mode: "mese", label: "Mese", icon: Grid3x3Icon },
];

/**
 * The calendar three ways: one bearer's month, one day for everyone, or the
 * paper sheet's grid. Until one is picked the screen decides — the bearer on
 * a phone, the grid from a tablet up — in CSS, so the server renders the right
 * one without knowing the width. The pick goes in the URL, with the bearer and
 * the day, so reloading or changing month keeps them.
 *
 * Whatever is on screen, print is always the grid.
 */
export function CalendarView({
  month,
  bearers,
  days,
  initialMode,
  initialBearer,
  initialDay,
}: {
  month: string;
  bearers: Bearer[];
  days: BearerDay[];
  initialMode: CalendarMode | null;
  initialBearer: string | undefined;
  initialDay: number | undefined;
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

  const calendar = daysOfMonth(month);
  const today = todayIso();
  const todayHere = today.startsWith(month) ? Number(today.slice(8)) : 1;

  const [mode, setMode] = useState<CalendarMode | null>(initialMode);
  const [bearerId, setBearerId] = useState(
    bearers.some((b) => b.id === initialBearer) ? initialBearer! : bearers[0].id,
  );
  const [day, setDayNumber] = useState(
    initialDay && initialDay <= calendar.length ? initialDay : todayHere,
  );

  const query = (next: {
    month?: string;
    mode?: CalendarMode | null;
    who?: string;
    day?: number | null;
  }) => {
    const params = new URLSearchParams({ month: next.month ?? month });
    const m = next.mode === undefined ? mode : next.mode;
    if (m) params.set("view", m);
    params.set("who", next.who ?? bearerId);
    const d = next.day === undefined ? day : next.day;
    if (d) params.set("day", String(d));
    return `/calendar?${params}`;
  };

  // Recorded without a navigation: the page has nothing new to fetch.
  const remember = (next: Parameters<typeof query>[0]) =>
    window.history.replaceState(null, "", query(next));

  function choose(bearer: string, date: string, mark: DayMark | null) {
    startTransition(async () => {
      applyMark({ k: key(bearer, date), mark });
      const { error } = await setDay(bearer, date, mark);
      if (error) toast.error(error);
    });
  }

  // With no pick, each button is lit on the screens where its view shows.
  const lit = "bg-background text-foreground shadow-sm";
  const autoLit: Record<CalendarMode, string> = {
    persona: "max-md:bg-background max-md:text-foreground max-md:shadow-sm",
    giorno: "",
    mese: "md:bg-background md:text-foreground md:shadow-sm",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild>
            <Link
              href={query({ month: shiftMonth(month, -1), day: null })}
              aria-label="Mese precedente"
            >
              <ChevronLeftIcon />
            </Link>
          </Button>
          <span className="w-28 text-center text-sm font-semibold">
            {monthLabel(month)}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link
              href={query({ month: shiftMonth(month, 1), day: null })}
              aria-label="Mese successivo"
            >
              <ChevronRightIcon />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Vista"
            className="bg-muted inline-flex rounded-lg p-0.5"
          >
            {MODES.map(({ mode: m, label, icon: Icon }) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === null ? undefined : mode === m}
                onClick={() => {
                  setMode(m);
                  remember({ mode: m });
                }}
                className={cn(
                  "text-muted-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                  mode === m && lit,
                  mode === null && autoLit[m],
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>

      <div
        className={cn(
          // Kept narrow on wide screens: a wall calendar does not need to be
          // a metre across.
          "mx-auto max-w-xl",
          mode === "persona" ? "print:hidden" : mode === null ? "md:hidden print:hidden" : "hidden",
        )}
      >
        <PersonView
          bearers={bearers}
          bearerId={bearerId}
          onBearerChange={(id) => {
            setBearerId(id);
            remember({ who: id });
          }}
          calendar={calendar}
          marks={marks}
          today={today}
          onChoose={choose}
        />
      </div>

      {mode === "giorno" && (
        <div className="mx-auto max-w-xl print:hidden">
          <DayView
            bearers={bearers}
            calendar={calendar}
            day={day}
            onDayChange={(d) => {
              setDayNumber(d);
              remember({ day: d });
            }}
            marks={marks}
            today={today}
            onChoose={choose}
          />
        </div>
      )}

      <div
        className={cn(
          mode === "mese" ? "" : mode === null ? "hidden md:block print:block" : "hidden print:block",
        )}
      >
        <CalendarGrid
          // Remounted on a switch, so it scrolls to today once it can be seen:
          // mounted hidden, it had no width to scroll.
          key={mode ?? "auto"}
          month={month}
          bearers={bearers}
          calendar={calendar}
          marks={marks}
          today={today}
          onChoose={choose}
        />
      </div>
    </div>
  );
}
