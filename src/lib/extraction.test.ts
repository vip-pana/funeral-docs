import { describe, expect, it } from "vitest";

import {
  availability,
  type Candidate,
  pickTeam,
  plusOneService,
  rankTeams,
} from "./extraction";

const c = (id: string, height: number, total: number): Candidate => ({
  id,
  height,
  total,
});

describe("availability", () => {
  it("leaves out a whole day off and a full day", () => {
    expect(availability({ code: "F", notice: 48 })).toEqual({
      available: false,
      reason: "Ferie",
    });
    expect(availability({ code: "R" })).toMatchObject({ reason: "Riposo" });
    expect(availability({ code: "M" })).toMatchObject({ reason: "Malattia" });
    expect(availability({ code: "L", services: 3 })).toMatchObject({
      available: false,
    });
  });

  it("keeps a free day, one with services, and half a day off", () => {
    expect(availability(undefined)).toEqual({ available: true });
    expect(availability({ code: "L", services: 1 })).toEqual({
      available: true,
      note: "1 servizio già segnato",
    });
    expect(
      availability({ code: "H", kind: "F", half: "M", services: 0 }),
    ).toEqual({ available: true, note: "Ferie mattina" });
    expect(
      availability({ code: "H", kind: "R", half: "P", services: 2 }),
    ).toEqual({
      available: true,
      note: "Riposo pomeriggio, 2 servizi già segnati",
    });
  });
});

describe("plusOneService", () => {
  it("adds a service, keeping the half day and the trial", () => {
    expect(plusOneService(undefined)).toEqual({ code: "L", services: 1 });
    expect(plusOneService({ code: "L", services: 2, trial: true })).toEqual({
      code: "L",
      services: 3,
      trial: true,
    });
    expect(
      plusOneService({ code: "H", kind: "F", half: "M", services: 0 }),
    ).toEqual({ code: "H", kind: "F", half: "M", services: 1 });
  });

  it("has no room on a full day or a day off", () => {
    expect(plusOneService({ code: "L", services: 3 })).toBeNull();
    expect(plusOneService({ code: "F", notice: 24 })).toBeNull();
    expect(plusOneService({ code: "M" })).toBeNull();
    expect(plusOneService({ code: "R" })).toBeNull();
  });
});

describe("pickTeam", () => {
  it("puts whoever has done least first, within the tolerance", () => {
    // 150-152 are the same height band; a, b, c, d have done more than e, f.
    const team = pickTeam(
      [
        c("a", 150, 5),
        c("b", 150, 5),
        c("c", 151, 5),
        c("d", 151, 5),
        c("e", 152, 1),
        c("f", 153, 1),
      ],
      4,
      3,
    );
    // e and f first; then two of the 5s, the pair closest to them.
    expect(team.ids.sort()).toEqual(["c", "d", "e", "f"]);
    expect(team.widened).toBe(false);
    expect(team.spread).toBe(2);
  });

  it("does not trade fairness for a closer match inside the tolerance", () => {
    const team = pickTeam(
      [c("a", 150, 4), c("b", 150, 4), c("c", 152, 0), c("d", 153, 0)],
      2,
      3,
    );
    expect(team.ids.sort()).toEqual(["c", "d"]);
  });

  it("keeps to the tolerance even for someone who has done nothing", () => {
    const team = pickTeam(
      [c("a", 150, 3), c("b", 151, 3), c("c", 158, 0)],
      2,
      3,
    );
    expect(team.ids.sort()).toEqual(["a", "b"]);
  });

  it("with a tolerance of 0 takes equal heights", () => {
    const team = pickTeam(
      [c("a", 150, 0), c("b", 151, 0), c("c", 151, 2), c("d", 149, 0)],
      2,
      0,
    );
    expect(team.ids.sort()).toEqual(["b", "c"]);
  });

  it("on equal totals takes the closest heights", () => {
    const team = pickTeam(
      [c("a", 148, 1), c("b", 151, 1), c("c", 150, 1), c("d", 150, 1)],
      2,
      3,
    );
    expect(team.ids.sort()).toEqual(["c", "d"]);
    expect(team.spread).toBe(0);
  });

  it("widens when no team fits, and says so", () => {
    const team = pickTeam(
      [c("a", 140, 0), c("b", 150, 0), c("c", 155, 0)],
      2,
      3,
    );
    expect(team.ids.sort()).toEqual(["b", "c"]);
    expect(team.widened).toBe(true);
    expect(team.spread).toBe(5);
  });

  it("takes everyone when there are not enough", () => {
    const team = pickTeam([c("a", 150, 0), c("b", 160, 0)], 4, 3);
    expect(team.ids).toEqual(["a", "b"]);
    expect(team.widened).toBe(true);
  });
});

describe("rankTeams", () => {
  // Five people of the same height and score, one who has done more.
  const same = [
    c("a", 150, 0),
    c("b", 150, 0),
    c("c", 150, 0),
    c("d", 151, 0),
    c("e", 150, 0),
    c("f", 150, 4),
  ];

  it("starts from the same team pickTeam proposes", () => {
    expect(rankTeams(same, 4, 3)[0]).toEqual(pickTeam(same, 4, 3));
  });

  it("then offers the other ways of picking among equal scores", () => {
    const teams = rankTeams(same, 4, 3);
    const keys = teams.map((t) => [...t.ids].sort().join(""));
    // Every team is different, and none leaves out a 0 for the 4 while one
    // with a 0 is still to come.
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.slice(0, 5).every((k) => !k.includes("f"))).toBe(true);
    expect(keys).toContain("bcde");
  });

  it("puts the fairer teams first, the closer heights on a tie", () => {
    const teams = rankTeams(same, 4, 3);
    // Among the 0s, those without d (151) come first: a spread of 0.
    expect(teams[0].spread).toBe(0);
    expect(teams.at(-1)!.ids).toContain("f");
  });

  it("stops at the limit", () => {
    expect(rankTeams(same, 2, 3, 3)).toHaveLength(3);
  });
});
