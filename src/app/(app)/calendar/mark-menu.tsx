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
  HALF_DAY_LABEL,
  HALF_KIND_LABEL,
  type HalfDay,
  halfKinds,
  isTrial,
  markLabel,
  markSign,
  sameMark,
  servicesOf,
  TRAVEL_LABEL,
  travelOf,
  trialAllowed,
  withHalfDay,
  withServices,
  withTravel,
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

/**
 * The colours of a mark outside the paper-sheet grid: ferie amber, rest
 * violet, sick leave grey, travel green, work blue. A half day takes the
 * colour of its half off; half a day of travel shows only with no services.
 */
export function markTone(mark: DayMark | undefined): string {
  if (!mark) return "";
  const kind =
    mark.code === "H"
      ? mark.kind
      : mark.code === "L" && !mark.services && mark.travel
        ? "V"
        : mark.code;
  if (kind === "V") {
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  }
  if (kind === "F") return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  if (kind === "R") {
    return "bg-violet-500/15 text-violet-800 dark:text-violet-300";
  }
  if (kind === "M") return "bg-zinc-500/20 text-zinc-800 dark:text-zinc-200";
  return "bg-sky-500/15 text-sky-800 dark:text-sky-300";
}

/**
 * What a cell shows. Half a day off is a small F (ferie) or R (rest) beside
 * the services, high for the morning and low for the afternoon, and half a
 * day of travel a small V the same way: the two never share a half.
 */
export function MarkGlyph({
  mark,
  isHoliday,
  hasContract,
}: {
  mark: DayMark;
  isHoliday: boolean;
  hasContract: boolean;
}) {
  const sign = markSign(mark, isHoliday, hasContract);
  const travel = travelOf(mark);
  if (mark.code !== "H" && !travel) return <>{sign}</>;
  const halves: { half: HalfDay; kind: string }[] = [];
  if (mark.code === "H") halves.push({ half: mark.half, kind: mark.kind });
  if (travel) halves.push({ half: travel, kind: "V" });
  const at = (half: HalfDay) => halves.find((h) => h.half === half);
  const morning = at("M");
  const afternoon = at("P");
  const small = (h: { half: HalfDay; kind: string }) => (
    <span data-half={h.half} data-kind={h.kind}>
      {h.kind}
    </span>
  );
  return (
    <span className="inline-flex h-[1.6em] items-stretch gap-px align-middle">
      <span
        className={cn(
          "flex flex-col text-[0.65em] leading-none",
          morning && afternoon
            ? "justify-between"
            : morning
              ? "justify-start"
              : "justify-end",
        )}
      >
        {morning && small(morning)}
        {afternoon && small(afternoon)}
      </span>
      {sign && <span className="self-center">{sign}</span>}
    </span>
  );
}

const HALVES: HalfDay[] = ["M", "P"];

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
  /**
   * `keepOpen` for a half day: the services of the other half are usually
   * the next thing picked.
   */
  onPick: (mark: DayMark | null, keepOpen?: boolean) => void;
  large?: boolean;
}) {
  const contract = bearer.hasContract;
  const option = cn(
    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm",
    "hover:bg-accent aria-pressed:bg-accent",
    large &&
      "h-14 gap-2 rounded-lg border px-3 text-left aria-pressed:border-primary aria-pressed:ring-2 aria-pressed:ring-primary/30",
  );
  const sign = cn("font-mono font-bold", large && "text-base");
  // Whole days off first, then the halves, then the services.
  const wholeDays = dayMarks(contract).filter((m) => m.code !== "L");
  const services = [1, 2, 3] as const;
  return (
    <>
      <div className={cn(large && "grid grid-cols-2 gap-2")}>
        {wholeDays.map((m) => (
          <button
            key={markLabel(m)}
            type="button"
            aria-pressed={sameMark(mark, m, contract)}
            onClick={() => onPick(m)}
            className={option}
          >
            {markLabel(m, contract)}
            <span className={sign}>{markSign(m, day.isHoliday, contract)}</span>
          </button>
        ))}
      </div>
      {halfKinds(contract).map((kind) => (
        <div key={kind}>
          <p
            className={cn(
              "px-2 pt-2 pb-0.5 text-xs text-muted-foreground",
              large && "px-0 pt-3",
            )}
          >
            {HALF_KIND_LABEL[kind]} mezza giornata
          </p>
          <div className={cn("grid grid-cols-2", large ? "gap-2" : "gap-0.5")}>
            {HALVES.map((half) => (
              <button
                key={half}
                type="button"
                aria-label={`${HALF_KIND_LABEL[kind]} ${HALF_DAY_LABEL[half].toLowerCase()}`}
                aria-pressed={
                  mark?.code === "H" && mark.kind === kind && mark.half === half
                }
                onClick={() => onPick(withHalfDay(mark, kind, half), true)}
                className={option}
              >
                {HALF_DAY_LABEL[half]}
                <span className={sign}>
                  <MarkGlyph
                    mark={{ code: "H", kind, half, services: 0 }}
                    isHoliday={day.isHoliday}
                    hasContract={contract}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p
          className={cn(
            "px-2 pt-2 pb-0.5 text-xs text-muted-foreground",
            large && "px-0 pt-3",
          )}
        >
          {TRAVEL_LABEL} mezza giornata
        </p>
        <div className={cn("grid grid-cols-2", large ? "gap-2" : "gap-0.5")}>
          {HALVES.map((half) => (
            <button
              key={half}
              type="button"
              aria-label={`${TRAVEL_LABEL} ${HALF_DAY_LABEL[half].toLowerCase()}`}
              aria-pressed={travelOf(mark) === half}
              onClick={() => onPick(withTravel(mark, half), true)}
              className={option}
            >
              {HALF_DAY_LABEL[half]}
              <span className={sign}>
                <MarkGlyph
                  mark={{ code: "L", services: 0, travel: half }}
                  isHoliday={day.isHoliday}
                  hasContract={contract}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className={cn("my-1 h-px bg-border", large && "my-2")} />
      {/* The same services twice for a bearer who is not on a contract: the
          second group records them as done in the trial period. */}
      {(trialAllowed(contract) ? [false, true] : [false]).map((trial) => (
        <div key={String(trial)}>
          {trial && (
            <p
              className={cn(
                "px-2 pt-2 pb-0.5 text-xs text-muted-foreground",
                large && "px-0 pt-3",
              )}
            >
              In prova
            </p>
          )}
          <div className={cn(large && "grid grid-cols-2 gap-2")}>
            {services.map((n) => {
              const m = withServices(mark, n, trial);
              const label = `${n === 1 ? "1 servizio" : `${n} servizi`}`;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={trial ? `${label} in prova` : undefined}
                  aria-pressed={
                    servicesOf(mark) === n && isTrial(mark) === trial
                  }
                  onClick={() => onPick(m)}
                  className={option}
                >
                  {label}
                  <span className={sign}>
                    {markSign(
                      { code: "L", services: n, ...(trial && { trial }) },
                      day.isHoliday,
                      contract,
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className={cn("my-1 h-px bg-border", large && "my-2")} />
      <button
        type="button"
        disabled={!mark}
        onClick={() => onPick(null)}
        className={cn(
          "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50",
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
  onPick: (mark: DayMark | null, keepOpen?: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-lg gap-2 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:rounded-2xl"
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
