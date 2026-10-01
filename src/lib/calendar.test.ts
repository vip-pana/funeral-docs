import { describe, expect, it } from "vitest";

import {
  bearerLabel,
  dayMarks,
  hidesTotal,
  isTrial,
  type DayMark,
  halfDayPoints,
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
  totalUpTo,
  withHalfDay,
  withServices,
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
    // Two ferie, sick leave and three counts of services.
    expect(dayMarks(false)).toHaveLength(6);
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
      restDays: 0,
      sickDays: 0,
    });
    expect(monthSummary(marks, days, true).total).toBe(2);
    expect(monthSummary(marks, days).total).toBe(serviceTotal(marks, days));
  });

  describe("half a day of ferie", () => {
    const days = daysOfMonth("2026-12");
    // Wednesday the 9th is a working day, Tuesday the 8th a holiday.
    const only = (day: number, mark: DayMark) =>
      days.map((d) => (d.day === day ? mark : undefined));

    it("is worth 1, 4 on a red day, nothing on a contract", () => {
      expect(halfDayPoints(false)).toBe(1);
      expect(halfDayPoints(true)).toBe(4);
      expect(halfDayPoints(false, true)).toBe(0);
      expect(halfDayPoints(true, true)).toBe(0);
    });

    it("adds up with the services of the other half", () => {
      const h3 = only(9, { code: "H", kind: "F", half: "M", services: 3 });
      const h1 = only(9, { code: "H", kind: "F", half: "P", services: 1 });
      expect(serviceTotal(h3, days)).toBe(4);
      expect(serviceTotal(h1, days)).toBe(2);
      // On a contract only the services count.
      expect(serviceTotal(h3, days, true)).toBe(3);
    });

    it("keeps its 4 on a red day, where the services do not count", () => {
      const marks = only(8, { code: "H", kind: "F", half: "M", services: 2 });
      expect(serviceTotal(marks, days)).toBe(4);
      expect(monthSummary(marks, days)).toEqual({
        total: 4,
        services: 0,
        holidayServices: 2,
        ferieDays: 0.5,
        feriePoints: 4,
        restDays: 0,
        sickDays: 0,
      });
    });

    it("toggles the half, keeping the services", () => {
      expect(withHalfDay(undefined, "F", "M")).toEqual({
        code: "H",
        kind: "F",
        half: "M",
        services: 0,
      });
      expect(withHalfDay({ code: "L", services: 2 }, "F", "P")).toEqual({
        code: "H",
        kind: "F",
        half: "P",
        services: 2,
      });
      // Tapped again: the half goes, the services stay.
      expect(
        withHalfDay({ code: "H", kind: "F", half: "P", services: 2 }, "F", "P"),
      ).toEqual({
        code: "L",
        services: 2,
      });
      expect(
        withHalfDay({ code: "H", kind: "F", half: "M", services: 0 }, "F", "M"),
      ).toBe(null);
      // The other half moves it.
      expect(
        withHalfDay({ code: "H", kind: "F", half: "M", services: 1 }, "F", "P"),
      ).toEqual({
        code: "H",
        kind: "F",
        half: "P",
        services: 1,
      });
      // A whole day of ferie gives way.
      expect(withHalfDay({ code: "F", notice: 48 }, "F", "M")).toEqual({
        code: "H",
        kind: "F",
        half: "M",
        services: 0,
      });
    });

    it("keeps the half when the services change", () => {
      expect(
        withServices({ code: "H", kind: "F", half: "M", services: 0 }, 3),
      ).toEqual({
        code: "H",
        kind: "F",
        half: "M",
        services: 3,
      });
      expect(withServices({ code: "F", notice: 24 }, 2)).toEqual({
        code: "L",
        services: 2,
      });
      expect(withServices(undefined, 1)).toEqual({ code: "L", services: 1 });
    });

    it("reads the stored rows", () => {
      const row = { services: null, noticeHours: null };
      expect(toMark({ ...row, code: "H", halfDay: "P" })).toEqual({
        code: "H",
        kind: "F",
        half: "P",
        services: 0,
      });
      expect(toMark({ ...row, code: "H", halfDay: "M", services: 3 })).toEqual({
        code: "H",
        kind: "F",
        half: "M",
        services: 3,
      });
      expect(toMark({ ...row, code: "H", halfDay: null })).toBeUndefined();
    });

    it("is labelled with its half and services", () => {
      expect(markLabel({ code: "H", kind: "F", half: "M", services: 0 })).toBe(
        "Ferie mattina",
      );
      expect(markLabel({ code: "H", kind: "F", half: "P", services: 2 })).toBe(
        "Ferie pomeriggio + 2 servizi",
      );
      expect(
        markSign({ code: "H", kind: "F", half: "P", services: 3 }, false),
      ).toBe("\\\\\\");
    });
  });

  describe("rest", () => {
    const days = daysOfMonth("2026-12");
    const only = (day: number, mark: DayMark) =>
      days.map((d) => (d.day === day ? mark : undefined));

    it("is offered only to a bearer on a contract", () => {
      expect(dayMarks(false).some((m) => m.code === "R")).toBe(false);
      expect(dayMarks(true).some((m) => m.code === "R")).toBe(true);
    });

    it("is worth nothing, whole or half, red days included", () => {
      expect(serviceTotal(only(9, { code: "R" }), days, true)).toBe(0);
      expect(serviceTotal(only(8, { code: "R" }), days, true)).toBe(0);
      const half = { code: "H", kind: "R", half: "P", services: 0 } as const;
      expect(serviceTotal(only(8, half), days, true)).toBe(0);
    });

    it("leaves the services of the other half to count", () => {
      const marks = only(9, { code: "H", kind: "R", half: "M", services: 2 });
      expect(serviceTotal(marks, days, true)).toBe(2);
      expect(monthSummary(marks, days, true)).toEqual({
        total: 2,
        services: 2,
        holidayServices: 0,
        ferieDays: 0,
        feriePoints: 0,
        restDays: 0.5,
        sickDays: 0,
      });
      expect(monthSummary(only(9, { code: "R" }), days, true).restDays).toBe(1);
    });

    it("swaps with ferie on the same half, keeping the services", () => {
      const ferie = { code: "H", kind: "F", half: "M", services: 1 } as const;
      expect(withHalfDay(ferie, "R", "M")).toEqual({
        code: "H",
        kind: "R",
        half: "M",
        services: 1,
      });
      expect(withHalfDay({ code: "R" }, "R", "P")).toEqual({
        code: "H",
        kind: "R",
        half: "P",
        services: 0,
      });
      expect(
        withHalfDay({ code: "H", kind: "R", half: "P", services: 3 }, "R", "P"),
      ).toEqual({ code: "L", services: 3 });
    });

    it("reads the stored rows", () => {
      const row = { services: null, noticeHours: null };
      expect(toMark({ ...row, code: "R" })).toEqual({ code: "R" });
      expect(toMark({ ...row, code: "R", halfDay: "M", services: 2 })).toEqual({
        code: "H",
        kind: "R",
        half: "M",
        services: 2,
      });
    });

    it("is labelled and hides the running total", () => {
      expect(markLabel({ code: "R" })).toBe("Riposo");
      expect(markSign({ code: "R" }, false)).toBe("R");
      expect(markLabel({ code: "H", kind: "R", half: "P", services: 1 })).toBe(
        "Riposo pomeriggio + 1 servizio",
      );
      expect(hidesTotal({ code: "R" }, true)).toBe(true);
      expect(
        hidesTotal({ code: "H", kind: "R", half: "M", services: 0 }, true),
      ).toBe(true);
      expect(
        hidesTotal({ code: "H", kind: "R", half: "M", services: 2 }, true),
      ).toBe(false);
      expect(hidesTotal({ code: "F", notice: 48 }, false)).toBe(false);
    });
  });

  describe("sick leave", () => {
    const days = daysOfMonth("2026-12");
    const only = (day: number, mark: DayMark) =>
      days.map((d) => (d.day === day ? mark : undefined));

    it("is offered to everyone", () => {
      expect(dayMarks(false).some((m) => m.code === "M")).toBe(true);
      expect(dayMarks(true).some((m) => m.code === "M")).toBe(true);
    });

    it("is worth nothing and counts as a day off sick", () => {
      const marks = only(9, { code: "M" });
      expect(serviceTotal(marks, days)).toBe(0);
      expect(serviceTotal(only(8, { code: "M" }), days)).toBe(0);
      expect(monthSummary(marks, days).sickDays).toBe(1);
      expect(hidesTotal({ code: "M" }, false)).toBe(true);
    });

    it("gives way to anything picked after it", () => {
      expect(withServices({ code: "M" }, 2)).toEqual({
        code: "L",
        services: 2,
      });
      expect(withHalfDay({ code: "M" }, "F", "M")).toEqual({
        code: "H",
        kind: "F",
        half: "M",
        services: 0,
      });
    });

    it("is read, labelled and signed", () => {
      const row = { services: null, noticeHours: null };
      expect(toMark({ ...row, code: "M" })).toEqual({ code: "M" });
      expect(markLabel({ code: "M" })).toBe("Malattia");
      expect(markSign({ code: "M" }, false)).toBe("M");
    });
  });

  describe("services in the trial period", () => {
    const days = daysOfMonth("2026-12");
    const only = (day: number, mark: DayMark) =>
      days.map((d) => (d.day === day ? mark : undefined));
    const pp = { code: "L", services: 2, trial: true } as const;

    it("is written P, PP, PPP and labelled", () => {
      expect(markSign({ code: "L", services: 1, trial: true }, false)).toBe(
        "P",
      );
      expect(markSign(pp, false)).toBe("PP");
      expect(markSign({ code: "L", services: 3, trial: true }, true)).toBe(
        "PPP",
      );
      expect(markLabel(pp)).toBe("2 servizi in prova");
    });

    it("counts like ordinary services, not on red days", () => {
      expect(serviceTotal(only(9, pp), days)).toBe(2);
      expect(serviceTotal(only(8, pp), days)).toBe(0);
      const half = {
        code: "H",
        kind: "F",
        half: "M",
        services: 3,
        trial: true,
      } as const;
      expect(serviceTotal(only(9, half), days)).toBe(4);
      expect(markLabel(half)).toBe("Ferie mattina + 3 servizi in prova");
    });

    it("switches between ordinary and trial services", () => {
      expect(withServices({ code: "L", services: 2 }, 2, true)).toEqual(pp);
      expect(withServices(pp, 2)).toEqual({ code: "L", services: 2 });
      expect(
        withServices({ code: "H", kind: "F", half: "P", services: 0 }, 1, true),
      ).toEqual({ code: "H", kind: "F", half: "P", services: 1, trial: true });
    });

    it("keeps the trial with the services when a half comes or goes", () => {
      expect(withHalfDay(pp, "F", "M")).toEqual({
        code: "H",
        kind: "F",
        half: "M",
        services: 2,
        trial: true,
      });
      expect(
        withHalfDay(
          { code: "H", kind: "F", half: "M", services: 2, trial: true },
          "F",
          "M",
        ),
      ).toEqual(pp);
    });

    it("is read from the row and told apart from ordinary services", () => {
      const row = { noticeHours: null };
      expect(toMark({ ...row, code: "L", services: 2, trial: true })).toEqual(
        pp,
      );
      expect(toMark({ ...row, code: "L", services: 2, trial: false })).toEqual({
        code: "L",
        services: 2,
      });
      expect(sameMark(pp, { code: "L", services: 2 })).toBe(false);
      expect(sameMark(pp, pp)).toBe(true);
      expect(isTrial(pp)).toBe(true);
    });
  });

  describe("totalUpTo", () => {
    const days = daysOfMonth("2026-12");
    // A service on the 9th and ferie on the 21st.
    const marks = days.map((d) =>
      d.day === 9
        ? ({ code: "L", services: 2 } as const)
        : d.day === 21
          ? ({ code: "F", notice: 48 } as const)
          : undefined,
    );

    it("leaves out the ferie still to come", () => {
      expect(totalUpTo(marks, days, "2026-12-15")).toBe(2);
      expect(serviceTotal(marks, days)).toBe(3);
    });

    it("counts the day itself", () => {
      expect(totalUpTo(marks, days, "2026-12-08")).toBe(0);
      expect(totalUpTo(marks, days, "2026-12-09")).toBe(2);
      expect(totalUpTo(marks, days, "2026-12-21")).toBe(3);
    });

    it("is 0 before the month and the whole total after it", () => {
      expect(totalUpTo(marks, days, "2026-11-30")).toBe(0);
      expect(totalUpTo(marks, days, "2027-01-05")).toBe(3);
    });

    it("leaves out the ferie of a bearer on a contract", () => {
      expect(totalUpTo(marks, days, "2026-12-31", true)).toBe(2);
    });
  });
});
