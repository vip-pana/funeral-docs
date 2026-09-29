"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type CalendarDay,
  type DayMark,
  dayMarks,
  markLabel,
  markSign,
  sameMark,
} from "@/lib/calendar";
import type { Bearer } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const DAY_FORMAT = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export const LONG_DAY_FORMAT = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export const utc = (date: string) => new Date(`${date}T00:00:00Z`);

/** The colours of a mark outside the paper-sheet grid: ferie amber, work blue. */
export function markTone(mark: DayMark | undefined): string {
  if (!mark) return "";
  return mark.code === "F"
    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
    : "bg-sky-500/15 text-sky-800 dark:text-sky-300";
}

/**
 * The choices for one bearer on one day, then Svuota. Compact in the grid's
 * popover, large and two to a row in the sheet phones get.
 */
export function MarkOptions({
  bearer,
  day,
  mark,
  onPick,
  large = false,
}: {
  bearer: Bearer;
  day: CalendarDay;
  mark: DayMark | undefined;
  onPick: (mark: DayMark | null) => void;
  large?: boolean;
}) {
  const contract = bearer.hasContract;
  return (
    <>
      <div className={cn(large && "grid grid-cols-2 gap-2")}>
        {dayMarks(contract).map((m) => (
          <button
            key={markLabel(m)}
            type="button"
            aria-pressed={sameMark(mark, m, contract)}
            onClick={() => onPick(m)}
            className={cn(
              "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm",
              "hover:bg-accent aria-pressed:bg-accent",
              large &&
                "aria-pressed:border-primary aria-pressed:ring-primary/30 h-14 gap-2 rounded-lg border px-3 text-left aria-pressed:ring-2",
            )}
          >
            {markLabel(m, contract)}
            <span className={cn("font-mono font-bold", large && "text-base")}>
              {markSign(m, day.isHoliday, contract)}
            </span>
          </button>
        ))}
      </div>
      <div className={cn("bg-border my-1 h-px", large && "my-2")} />
      <button
        type="button"
        disabled={!mark}
        onClick={() => onPick(null)}
        className={cn(
          "hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm disabled:opacity-50",
          large && "h-12 rounded-lg border text-center text-base",
        )}
      >
        Svuota
      </button>
    </>
  );
}

/** The same choices from the bottom of the screen, for the phone views. */
export function MarkSheet({
  target,
  mark,
  onPick,
  onClose,
}: {
  target: { bearer: Bearer; day: CalendarDay } | null;
  mark: DayMark | undefined;
  onPick: (mark: DayMark | null) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-lg gap-2 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:bottom-4"
      >
        {target && (
          <>
            <SheetHeader className="pb-1">
              <SheetTitle>{target.bearer.name}</SheetTitle>
              <SheetDescription className="first-letter:uppercase">
                {LONG_DAY_FORMAT.format(utc(target.day.date))}
                {target.day.isHoliday && " · festivo, i servizi non contano"}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <MarkOptions
                large
                bearer={target.bearer}
                day={target.day}
                mark={mark}
                onPick={onPick}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
