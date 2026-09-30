import { describe, expect, it } from "vitest";

import {
  bearerLabel,
  dayMarks,
  daysOfMonth,
  easterSunday,
  holidayPoints,
  markLabel,
  markSign,
  monthSummary,
  moveOnto,
  monthLabel,
  todayIso,
  toMark,
  weekdayIndex,
  parseMonth,
  runningTotals,
  sameMark,
  serviceTotal,
  shiftMonth,
} from "./calendar";

describe("calendar helpers", () => {
  it("lists the days of a month and flags the Sundays", () => {
    const days = daysOfMonth("2026-10");
    expect(days).toHaveLength(31);
    expect(days.filter((d) => d.isSunday).map((d) => d.day)).toEqual([
      4, 11, 18, 25,
    ]);
    expect(days[0].date).toBe("2026-10-01");
  });

  it("knows February in a leap year", () => {
    expect(daysOfMonth("2028-02")).toHaveLength(29);
    expect(daysOfMonth("2026-02")).toHaveLength(28);
  });

  it("labels the month as the sheet does", () => {
    expect(monthLabel("2026-10")).toBe("Ottobre '26");
  });

  it("shifts across the year boundary", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });

  it("falls back to the current month on a malformed parameter", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    expect(parseMonth("2026-11", now)).toBe("2026-11");
    expect(parseMonth("2026-13", now)).toBe("2026-10");
    expect(parseMonth(undefined, now)).toBe("2026-10");
  });

  it("prints the height in metres before the name", () => {
    expect(bearerLabel({ name: "Perillo", shoulderHeight: 158 })).toBe(
      "1,58 PERILLO",
    );
    expect(bearerLabel({ name: "Stella", shoulderHeight: 150 })).toBe(
      "1,50 STELLA",
    );
    expect(bearerLabel({ name: "Rossi", shoulderHeight: null })).toBe("ROSSI");
  });

  describe("moveOnto", () => {
    const rows = ["a", "b", "c", "d"].map((id) => ({ id }));
    const ids = (r: { id: string }[]) => r.map((x) => x.id).join("");

    it("moves a row up, onto the one it is dropped on", () => {
      expect(ids(moveOnto(rows, "d", "b"))).toBe("adbc");
    });

    it("moves a row down the same way", () => {
      expect(ids(moveOnto(rows, "a", "c"))).toBe("bcad");
    });

    it("leaves the list alone for an unknown id", () => {
      expect(moveOnto(rows, "z", "a")).toBe(rows);
      expect(moveOnto(rows, "a", "z")).toBe(rows);
    });
  });

  it("scores ferie by notice and kind of day", () => {
    expect(holidayPoints(48, false)).toBe(1);
    expect(holidayPoints(24, false)).toBe(2);
    expect(holidayPoints(48, true)).toBe(4);
    expect(holidayPoints(24, true)).toBe(8);
  });

  it("writes the sheet's sign for each kind of day", () => {
    expect(markSign({ code: "F", notice: 48 }, false)).toBe("F1");
    expect(markSign({ code: "F", notice: 24 }, true)).toBe("F8");
    expect(markSign({ code: "L", services: 1 }, false)).toBe("\\");
    expect(markSign({ code: "L", services: 2 }, true)).toBe("X");
    expect(markSign({ code: "L", services: 3 }, false)).toBe("\\\\\\");
    expect(markLabel({ code: "F", notice: 24 })).toBe("Ferie, avviso 24 ore");
    expect(markLabel({ code: "L", services: 1 })).toBe("1 servizio");
    expect(markLabel({ code: "L", services: 3 })).toBe("3 servizi");
  });

  it("scores no ferie for a bearer on a contract", () => {
    expect(holidayPoints(48, false, true)).toBe(0);
    expect(holidayPoints(24, true, true)).toBe(0);
    expect(markSign({ code: "F", notice: 24 }, true, true)).toBe("F");
    expect(markSign({ code: "L", services: 2 }, false, true)).toBe("X");
    expect(markLabel({ code: "F", notice: 48 }, true)).toBe("Ferie");
  });

  it("offers a contract a single ferie entry", () => {
    expect(dayMarks(false)).toHaveLength(5);
    const ferie = dayMarks(true).filter((m) => m.code === "F");
    expect(ferie).toEqual([{ code: "F", notice: 48 }]);
    // A day saved with 24 hours' notice still shows as that entry.
    expect(sameMark({ code: "F", notice: 24 }, ferie[0], true)).toBe(true);
    expect(sameMark({ code: "F", notice: 24 }, ferie[0])).toBe(false);
  });

  it("reads a stored row back as a mark", () => {
    const row = { services: null, noticeHours: null };
    expect(toMark({ ...row, code: "F", noticeHours: 24 })).toEqual({
      code: "F",
      notice: 24,
    });
    // Saved before the notice existed.
    expect(toMark({ ...row, code: "F" })).toEqual({ code: "F", notice: 48 });
    expect(toMark({ ...row, code: "L", services: 2 })).toEqual({
      code: "L",
      services: 2,
    });
    expect(toMark({ ...row, code: "L", services: 4 })).toBeUndefined();
  });

  it("finds Easter", () => {
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });

  it("flags national holidays, Easter Monday and the patron feast", () => {
    const holiday = (month: string, day: number) =>
      daysOfMonth(month)[day - 1].isHoliday;
    expect(holiday("2026-04", 6)).toBe(true);
    expect(holiday("2026-05", 17)).toBe(true);
    expect(holiday("2026-05", 18)).toBe(true);
    expect(holiday("2026-05", 19)).toBe(false);
    expect(holiday("2026-12", 8)).toBe(true);
    expect(holiday("2026-12", 25)).toBe(true);
    expect(holiday("2026-10", 12)).toBe(false);
  });

  it("counts services on working days only, ferie on every day", () => {
    const days = daysOfMonth("2026-12");
    const marks = days.map((d) =>
      [7, 8, 13, 14].includes(d.day)
        ? ({ code: "L", services: 2 } as const)
        : d.day === 9
          ? ({ code: "F", notice: 48 } as const)
          : d.day === 20
            ? ({ code: "F", notice: 24 } as const)
            : undefined,
    );
    // Services: the 8th is a holiday and the 13th a Sunday, so only the 7th
    // and 14th count (4). Ferie: the 9th, a Wednesday (1), and Sunday the
    // 20th with 24 hours' notice (8).
    expect(serviceTotal(marks, days)).toBe(13);
  });

  it("counts only the services of a bearer on a contract", () => {
    const days = daysOfMonth("2026-12");
    const marks = days.map((d) =>
      d.day === 7
        ? ({ code: "L", services: 2 } as const)
        : d.day === 9
          ? ({ code: "F", notice: 48 } as const)
          : d.day === 20
            ? ({ code: "F", notice: 24 } as const)
            : undefined,
    );
    expect(serviceTotal(marks, days, true)).toBe(2);
    expect(serviceTotal(marks, days)).toBe(11);
  });

  it("keeps a running total that holidays do not move", () => {
    const days = daysOfMonth("2026-12");
    const marks = days.map((d) =>
      [7, 8, 14].includes(d.day)
        ? ({ code: "L", services: 2 } as const)
        : undefined,
    );
    const totals = runningTotals(marks, days);
    expect(totals[6]).toBe(2); // 7th
    expect(totals[7]).toBe(2); // 8th, a holiday
    expect(totals[13]).toBe(4); // 14th
  });

  it("finds today in Rome and the weekday from Monday", () => {
    // 23:30 UTC on the 30th is already the 1st in Rome.
    expect(todayIso(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(weekdayIndex("2026-09-28")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-04")).toBe(6); // Sunday
  });

  it("takes the month's total apart", () => {
    const days = daysOfMonth("2026-12");
    const marks = days.map((d) =>
      [7, 8].includes(d.day)
        ? ({ code: "L", services: 2 } as const)
        : d.day === 9
          ? ({ code: "F", notice: 24 } as const)
          : undefined,
    );
    expect(monthSummary(marks, days)).toEqual({
      total: 4,
      services: 2,
      holidayServices: 2,
      ferieDays: 1,
      feriePoints: 2,
    });
    expect(monthSummary(marks, days, true).total).toBe(2);
    expect(monthSummary(marks, days).total).toBe(serviceTotal(marks, days));
  });
});
