/**
 * Pure helpers for the bearers' calendar. No database here: the grid is a
 * client component and imports them.
 *
 * A month is carried as "yyyy-mm", the shape of the `?month=` parameter, and
 * days as ISO dates, like every other date in the app.
 */

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The current month in Rome: in UTC the 1st starts an hour or two late. */
export function currentMonth(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

/** The `?month=` parameter, or the current month when absent or malformed. */
export function parseMonth(
  value: string | undefined,
  now = new Date(),
): string {
  return value && MONTH.test(value) ? value : currentMonth(now);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Easter Sunday, by the anonymous Gregorian algorithm (Meeus). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const NATIONAL = [
  "01-01",
  "01-06",
  "04-25",
  "05-01",
  "06-02",
  "08-15",
  "11-01",
  "12-08",
  "12-25",
  "12-26",
];

/**
 * The public holidays of a year, as ISO dates: the national ones, Easter
 * Monday, and the patron feast (the third Sunday of May and the Monday after).
 * Sundays are not listed: `daysOfMonth` flags them on its own.
 */
export function holidays(year: number): Set<string> {
  const out = new Set(NATIONAL.map((md) => `${year}-${md}`));

  const easter = easterSunday(year);
  out.add(iso(new Date(easter.getTime() + 86_400_000)));

  // The first Sunday of May is between the 1st and the 7th; the third is two
  // weeks later.
  const may1 = new Date(Date.UTC(year, 4, 1)).getUTCDay();
  const thirdSunday = 1 + ((7 - may1) % 7) + 14;
  out.add(iso(new Date(Date.UTC(year, 4, thirdSunday))));
  out.add(iso(new Date(Date.UTC(year, 4, thirdSunday + 1))));

  return out;
}

export type CalendarDay = {
  day: number;
  date: string;
  isSunday: boolean;
  /** A Sunday or a public holiday: printed in red; services do not count. */
  isHoliday: boolean;
};

export function daysOfMonth(month: string): CalendarDay[] {
  const [year, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const feasts = holidays(year);
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const isSunday = new Date(Date.UTC(year, m - 1, day)).getUTCDay() === 0;
    return { day, date, isSunday, isHoliday: isSunday || feasts.has(date) };
  });
}

/** "Ottobre '26", as in the corner of the paper sheet. */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const name = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m - 1, 1)));
  return `${name[0].toUpperCase()}${name.slice(1)} '${String(year).slice(2)}`;
}

/** "1,58 PERILLO": the shoulder height in metres, then the name. */
export function bearerLabel(bearer: {
  name: string;
  shoulderHeight: number | null;
}): string {
  const name = bearer.name.toUpperCase();
  if (bearer.shoulderHeight == null) return name;
  return `${(bearer.shoulderHeight / 100).toFixed(2).replace(".", ",")} ${name}`;
}

/**
 * The list with `id` moved to where `overId` was, as a row dropped onto
 * another lands: the rows in between shift by one. Unchanged if either is
 * missing.
 */
export function moveOnto<T extends { id: string }>(
  items: T[],
  id: string,
  overId: string,
): T[] {
  const from = items.findIndex((item) => item.id === id);
  const to = items.findIndex((item) => item.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/**
 * What a cell records: a day of ferie with the hours of notice given, a day
 * of rest (riposo, only for bearers on a contract), a day of sick leave
 * (malattia, always the whole day and nothing else), a day worked with 1 to
 * 3 services, or half a day of ferie or rest — the morning or the afternoon
 * — with up to 3 services in the other half, or a day of travel (viaggio,
 * the whole day and nothing else). Anyone can travel, and it scores nothing.
 *
 * `travel` marks half a day of travel, the morning or the afternoon, beside
 * whatever the day holds: services, half a day off in the other half, or on
 * its own as a worked day with no services. Never in the half already off.
 *
 * `trial` marks the services of a bearer in their trial period (prova): they
 * count the same, and are written P, PP, PPP. Never on a contract.
 */
export type DayMark =
  | { code: "F"; notice: 48 | 24 }
  | { code: "R" }
  | { code: "M" }
  | { code: "V" }
  | {
      code: "L";
      /** 0 only beside half a day of travel. */
      services: 0 | 1 | 2 | 3;
      travel?: HalfDay;
      trial?: true;
    }
  | {
      code: "H";
      kind: HalfKind;
      half: HalfDay;
      services: 0 | 1 | 2 | 3;
      travel?: HalfDay;
      trial?: true;
    };

/** "M" for the morning, "P" for the afternoon (pomeriggio). */
export type HalfDay = "M" | "P";

/** What the half day off is: ferie ("F") or rest ("R"). */
export type HalfKind = "F" | "R";

export const HALF_KIND_LABEL: Record<HalfKind, string> = {
  F: "Ferie",
  R: "Riposo",
};

export const HALF_DAY_LABEL: Record<HalfDay, string> = {
  M: "Mattina",
  P: "Pomeriggio",
};

/** Every choice the cell menu offers, in the order it shows them. */
export const DAY_MARKS: DayMark[] = [
  { code: "F", notice: 48 },
  { code: "F", notice: 24 },
  { code: "R" },
  { code: "M" },
  { code: "V" },
  { code: "L", services: 1 },
  { code: "L", services: 2 },
  { code: "L", services: 3 },
];

/**
 * The choices for one bearer. Those on a contract get a single entry for
 * ferie: their ferie score nothing, so the notice would change nothing. It is
 * saved as 48 hours, what an unmarked notice has always been read as. Rest is
 * for them alone.
 */
export function dayMarks(hasContract: boolean): DayMark[] {
  if (!hasContract) return DAY_MARKS.filter((m) => m.code !== "R");
  return DAY_MARKS.filter((m) => m.code !== "F" || m.notice === 48);
}

/** The halves of a day off a bearer can take: rest only on a contract. */
export function halfKinds(hasContract: boolean): HalfKind[] {
  return hasContract ? ["F", "R"] : ["F"];
}

/**
 * Whether the services can be marked as done in the trial period: not for a
 * bearer on a contract, who is past it.
 */
export function trialAllowed(hasContract: boolean): boolean {
  return !hasContract;
}

/** Whether the day's services were done in the trial period. */
export function isTrial(mark: DayMark | undefined): boolean {
  return (mark?.code === "L" || mark?.code === "H") && mark.trial === true;
}

/** The services done that day: none on a whole day of ferie or rest. */
export function servicesOf(mark: DayMark | undefined): number {
  return mark && (mark.code === "L" || mark.code === "H") ? mark.services : 0;
}

/**
 * Whether the cell leaves out its running total: the day adds nothing to it
 * by design, a bearer on a contract's ferie or a rest.
 */
export function hidesTotal(mark: DayMark, hasContract: boolean): boolean {
  if (mark.code === "R" || mark.code === "M" || mark.code === "V") return true;
  if (mark.code === "F") return hasContract;
  if (mark.code === "L") return mark.services === 0;
  if (mark.code === "H") {
    return mark.services === 0 && (mark.kind === "R" || hasContract);
  }
  return false;
}

/**
 * What a day of ferie adds to the total: shorter notice and a red day each
 * double it. Nothing for a bearer on a contract.
 */
export function holidayPoints(
  notice: 48 | 24,
  isHoliday: boolean,
  hasContract = false,
): number {
  if (hasContract) return 0;
  return (notice === 24 ? 2 : 1) * (isHoliday ? 4 : 1);
}

/**
 * What half a day of ferie adds: always 1, whatever the notice, and 4 on a
 * red day like a whole one. Nothing for a bearer on a contract. Rest, whole
 * or half, never adds anything.
 */
export function halfDayPoints(isHoliday: boolean, hasContract = false): number {
  if (hasContract) return 0;
  return isHoliday ? 4 : 1;
}

const SERVICE_SIGNS = ["", "\\", "X", "\\\\\\"];

/**
 * The sign written in the cell, as on the paper sheet. A bearer on a contract
 * gets a bare "F": there are no points to write after it.
 */
export function markSign(
  mark: DayMark,
  isHoliday: boolean,
  hasContract = false,
): string {
  if (mark.code === "F") {
    return hasContract ? "F" : `F${holidayPoints(mark.notice, isHoliday)}`;
  }
  if (mark.code === "R" || mark.code === "M" || mark.code === "V") {
    return mark.code;
  }
  // Half a day shows only the services here: the small F, R or V beside them
  // is drawn by the cell, above or below depending on the half.
  if (mark.trial) return "P".repeat(mark.services);
  return SERVICE_SIGNS[mark.services];
}

const servicesLabel = (n: number, trial = false) =>
  `${n === 1 ? "1 servizio" : `${n} servizi`}${trial ? " in prova" : ""}`;

export function markLabel(mark: DayMark, hasContract = false): string {
  if (mark.code === "F") {
    return hasContract ? "Ferie" : `Ferie, avviso ${mark.notice} ore`;
  }
  if (mark.code === "R") return "Riposo";
  if (mark.code === "M") return "Malattia";
  if (mark.code === "V") return TRAVEL_LABEL;
  const parts = [];
  if (mark.code === "H") {
    parts.push(
      `${HALF_KIND_LABEL[mark.kind]} ${HALF_DAY_LABEL[mark.half].toLowerCase()}`,
    );
  }
  if (mark.travel) {
    parts.push(`${TRAVEL_LABEL} ${HALF_DAY_LABEL[mark.travel].toLowerCase()}`);
  }
  if (mark.services) parts.push(servicesLabel(mark.services, mark.trial));
  return parts.join(" + ");
}

export const TRAVEL_LABEL = "Viaggio";

/** The half of the day spent travelling, if any. */
export function travelOf(mark: DayMark | undefined): HalfDay | undefined {
  return mark && (mark.code === "L" || mark.code === "H")
    ? mark.travel
    : undefined;
}

/**
 * The day after tapping Mattina or Pomeriggio on the ferie or the rest row.
 * The same half of the same kind is taken off again, leaving the services on
 * their own; anything else takes its place, keeping the services. A whole day
 * of ferie or rest gives way to the half.
 */
export function withHalfDay(
  mark: DayMark | undefined,
  kind: HalfKind,
  half: HalfDay,
): DayMark | null {
  const services = servicesOf(mark) as 0 | 1 | 2 | 3;
  // The trial goes with the services, and only while there are some.
  const trial = services && isTrial(mark) ? { trial: true as const } : {};
  // Travel stays in the other half; the half taken off ends it.
  const kept = travelOf(mark);
  const travel = kept && kept !== half ? { travel: kept } : {};
  if (mark?.code === "H" && mark.kind === kind && mark.half === half) {
    return services || travel.travel
      ? { code: "L", services, ...travel, ...trial }
      : null;
  }
  return { code: "H", kind, half, services, ...travel, ...trial };
}

/**
 * The day after tapping Mattina or Pomeriggio on the travel row. The same
 * half is taken off again, leaving the rest of the day; anything else takes
 * its place, keeping the services and a half day off in the other half. A
 * whole day off, sick or of travel gives way to the half, as does a half day
 * off in the same half.
 */
export function withTravel(
  mark: DayMark | undefined,
  half: HalfDay,
): DayMark | null {
  const services = servicesOf(mark) as 0 | 1 | 2 | 3;
  const trial = services && isTrial(mark) ? { trial: true as const } : {};
  const off = mark?.code === "H" && mark.half !== half ? mark : undefined;
  if (travelOf(mark) === half) {
    if (off)
      return { code: "H", kind: off.kind, half: off.half, services, ...trial };
    return services ? { code: "L", services, ...trial } : null;
  }
  if (off) {
    return {
      code: "H",
      kind: off.kind,
      half: off.half,
      services,
      travel: half,
      ...trial,
    };
  }
  return { code: "L", services, travel: half, ...trial };
}

/**
 * The day after picking a number of services, in the trial period or not: a
 * half day off stays.
 */
export function withServices(
  mark: DayMark | undefined,
  services: 1 | 2 | 3,
  trial = false,
): DayMark {
  const flag = trial ? { trial: true as const } : {};
  const kept = travelOf(mark);
  const travel = kept ? { travel: kept } : {};
  if (mark?.code === "H") {
    const { code, kind, half } = mark;
    return { code, kind, half, services, ...travel, ...flag };
  }
  return { code: "L", services, ...travel, ...flag };
}

/**
 * Whether a cell holds a choice. For a bearer on a contract any day of ferie
 * is their one ferie entry, including one saved with 24 hours' notice before
 * they had the contract.
 */
export function sameMark(
  a: DayMark | undefined,
  b: DayMark,
  hasContract = false,
): boolean {
  if (!a || a.code !== b.code) return false;
  if (a.code === "F") {
    return b.code === "F" && (hasContract || a.notice === b.notice);
  }
  if (a.code === "R" || a.code === "M" || a.code === "V") return true;
  if (travelOf(a) !== travelOf(b)) return false;
  if (a.code === "H") {
    return (
      b.code === "H" &&
      a.kind === b.kind &&
      a.half === b.half &&
      a.services === b.services &&
      isTrial(a) === isTrial(b)
    );
  }
  return (
    b.code === "L" && a.services === b.services && isTrial(a) === isTrial(b)
  );
}

/** A stored row as a mark, or undefined for a row this version cannot read. */
export function toMark(row: {
  code: string;
  services: number | null;
  noticeHours: number | null;
  halfDay?: string | null;
  travelHalf?: string | null;
  trial?: boolean;
}): DayMark | undefined {
  if (row.code === "F") {
    return { code: "F", notice: row.noticeHours === 24 ? 24 : 48 };
  }
  const services = row.services;
  const trial = row.trial && services ? { trial: true as const } : {};
  if (row.code === "M") return { code: "M" };
  if (row.code === "V") return { code: "V" };
  const half = row.travelHalf;
  const travel: { travel?: HalfDay } =
    (half === "M" || half === "P") && half !== row.halfDay
      ? { travel: half }
      : {};
  // A rest with no half is the whole day.
  if (row.code === "R" && row.halfDay == null) return { code: "R" };
  if (
    (row.code === "H" || row.code === "R") &&
    (row.halfDay === "M" || row.halfDay === "P")
  ) {
    const n = services ?? 0;
    if (n === 0 || n === 1 || n === 2 || n === 3) {
      const kind = row.code === "H" ? "F" : "R";
      return {
        code: "H",
        kind,
        half: row.halfDay,
        services: n,
        ...travel,
        ...trial,
      };
    }
    return undefined;
  }
  if (
    row.code === "L" &&
    (services === 1 || services === 2 || services === 3)
  ) {
    return { code: "L", services, ...travel, ...trial };
  }
  if (row.code === "L" && !services && travel.travel) {
    return { code: "L", services: 0, ...travel };
  }
  return undefined;
}

/**
 * The month's total: services done on working days (those on Sundays and
 * holidays are recorded but do not count) plus the points of every day of
 * ferie, red days included — none for a bearer on a contract.
 */
export function serviceTotal(
  marks: (DayMark | undefined)[],
  days: CalendarDay[],
  hasContract = false,
): number {
  return runningTotals(marks, days, hasContract).at(-1) ?? 0;
}

/**
 * The total at the end of `date`, that day included: what the office goes by
 * to decide who works next, since ferie still to come must not weigh yet. 0
 * before the month, the whole month's total after it.
 */
export function totalUpTo(
  marks: (DayMark | undefined)[],
  days: CalendarDay[],
  date: string,
  hasContract = false,
): number {
  const totals = runningTotals(marks, days, hasContract);
  if (!days.length || date < days[0].date) return 0;
  const last = days.findLastIndex((d) => d.date <= date);
  return totals[last];
}

/** The month's total so far, day by day: what the corner of each cell shows. */
export function runningTotals(
  marks: (DayMark | undefined)[],
  days: CalendarDay[],
  hasContract = false,
): number[] {
  let sum = 0;
  return days.map((d, i) => {
    const mark = marks[i];
    if (mark?.code === "F") {
      sum += holidayPoints(mark.notice, d.isHoliday, hasContract);
      return sum;
    }
    if (mark?.code === "H" && mark.kind === "F") {
      sum += halfDayPoints(d.isHoliday, hasContract);
    }
    if (!d.isHoliday) sum += servicesOf(mark);
    return sum;
  });
}

/** Today in Rome, as an ISO date. */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(
    now,
  );
}

/** 0 for Monday to 6 for Sunday: the Italian week starts on Monday. */
export function weekdayIndex(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export type MonthSummary = {
  /** The month's total, as in the Tot. column. */
  total: number;
  /** Services on working days: the ones that count. */
  services: number;
  /** Services on Sundays and holidays: recorded, not counted. */
  holidayServices: number;
  /** Half days count as 0.5. */
  ferieDays: number;
  feriePoints: number;
  /** Days of rest, half days as 0.5: only a bearer on a contract has them. */
  restDays: number;
  /** Days of sick leave: always whole, worth nothing. */
  sickDays: number;
  /** Days of travel, half days as 0.5: worth nothing. */
  travelDays: number;
};

/** The month's total taken apart, for the view of a single bearer. */
export function monthSummary(
  marks: (DayMark | undefined)[],
  days: CalendarDay[],
  hasContract = false,
): MonthSummary {
  const out: MonthSummary = {
    total: 0,
    services: 0,
    holidayServices: 0,
    ferieDays: 0,
    feriePoints: 0,
    restDays: 0,
    sickDays: 0,
    travelDays: 0,
  };
  days.forEach((d, i) => {
    const mark = marks[i];
    if (mark?.code === "F") {
      out.ferieDays++;
      out.feriePoints += holidayPoints(mark.notice, d.isHoliday, hasContract);
    } else if (mark?.code === "R") {
      out.restDays++;
    } else if (mark?.code === "M") {
      out.sickDays++;
    } else if (mark?.code === "V") {
      out.travelDays++;
    } else if (mark) {
      if (mark.travel) out.travelDays += 0.5;
      if (mark.code === "H" && mark.kind === "F") {
        out.ferieDays += 0.5;
        out.feriePoints += halfDayPoints(d.isHoliday, hasContract);
      } else if (mark.code === "H") {
        out.restDays += 0.5;
      }
      if (d.isHoliday) out.holidayServices += mark.services;
      else out.services += mark.services;
    }
  });
  out.total = out.services + out.feriePoints;
  return out;
}
