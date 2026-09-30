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
 * What a cell records: a day of ferie with the hours of notice given, or a
 * day worked with 1 to 3 services.
 */
export type DayMark =
  { code: "F"; notice: 48 | 24 } | { code: "L"; services: 1 | 2 | 3 };

/** Every choice the cell menu offers, in the order it shows them. */
export const DAY_MARKS: DayMark[] = [
  { code: "F", notice: 48 },
  { code: "F", notice: 24 },
  { code: "L", services: 1 },
  { code: "L", services: 2 },
  { code: "L", services: 3 },
];

/**
 * The choices for one bearer. Those on a contract get a single entry for
 * ferie: their ferie score nothing, so the notice would change nothing. It is
 * saved as 48 hours, what an unmarked notice has always been read as.
 */
export function dayMarks(hasContract: boolean): DayMark[] {
  if (!hasContract) return DAY_MARKS;
  return DAY_MARKS.filter((m) => m.code !== "F" || m.notice === 48);
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
  return ["\\", "X", "\\\\\\"][mark.services - 1];
}

export function markLabel(mark: DayMark, hasContract = false): string {
  if (mark.code === "F") {
    return hasContract ? "Ferie" : `Ferie, avviso ${mark.notice} ore`;
  }
  return mark.services === 1 ? "1 servizio" : `${mark.services} servizi`;
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
  return b.code === "L" && a.services === b.services;
}

/** A stored row as a mark, or undefined for a row this version cannot read. */
export function toMark(row: {
  code: string;
  services: number | null;
  noticeHours: number | null;
}): DayMark | undefined {
  if (row.code === "F") {
    return { code: "F", notice: row.noticeHours === 24 ? 24 : 48 };
  }
  const services = row.services;
  if (
    row.code === "L" &&
    (services === 1 || services === 2 || services === 3)
  ) {
    return { code: "L", services };
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
    } else if (mark?.code === "L" && !d.isHoliday) sum += mark.services;
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
  ferieDays: number;
  feriePoints: number;
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
  };
  days.forEach((d, i) => {
    const mark = marks[i];
    if (mark?.code === "F") {
      out.ferieDays++;
      out.feriePoints += holidayPoints(mark.notice, d.isHoliday, hasContract);
    } else if (mark?.code === "L") {
      if (d.isHoliday) out.holidayServices += mark.services;
      else out.services += mark.services;
    }
  });
  out.total = out.services + out.feriePoints;
  return out;
}
