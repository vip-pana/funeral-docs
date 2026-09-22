import { describe, expect, it } from "vitest";

import { checkChar, computeTaxCode } from "./tax-code";

/**
 * The computed code only proposes a value, so the tests pin the rules of the
 * decree rather than any single real person's code.
 */

const MARIO = {
  firstName: "Mario",
  lastName: "Rossi",
  birthDate: "1940-03-12",
  cadastralCode: "D643",
  isFemale: false,
};

describe("computeTaxCode", () => {
  it("computes the code of a man", () => {
    expect(computeTaxCode(MARIO)).toBe("RSSMRA40C12D643D");
  });

  it("adds 40 to the day for a woman, which also changes the check character", () => {
    expect(computeTaxCode({ ...MARIO, isFemale: true })).toBe(
      "RSSMRA40C52D643H",
    );
  });

  it("takes the first, third and fourth consonant of a first name with four", () => {
    // Alessandro -> L,S,S,N,D,R: the rule skips the second consonant.
    expect(computeTaxCode({ ...MARIO, firstName: "Alessandro" })).toBe(
      "RSSLSN40C12D643T",
    );
  });

  it("takes consonants then vowels when the first name has fewer than four", () => {
    // Mario -> M,R + A,I,O, so MRA and not MRO.
    expect(computeTaxCode(MARIO)?.slice(3, 6)).toBe("MRA");
  });

  /**
   * Someone born abroad carries the code of their country of birth where a
   * municipality's would be. Nothing in the algorithm treats it differently —
   * what was missing was the country in the list.
   */
  it("accepts the code of a foreign country of birth", () => {
    expect(computeTaxCode({ ...MARIO, cadastralCode: "Z112" })).toBe(
      "RSSMRA40C12Z112F",
    );
  });

  it("pads short names with X", () => {
    expect(computeTaxCode({ ...MARIO, firstName: "Al", lastName: "Fo" })).toBe(
      "FOXLAX40C12D643G",
    );
  });

  it("works on names made of vowels only", () => {
    expect(
      computeTaxCode({ ...MARIO, firstName: "Aia", lastName: "Aia" }),
    ).toBe("AIAAIA40C12D643A");
  });

  it("strips accents and apostrophes", () => {
    expect(
      computeTaxCode({ ...MARIO, firstName: "Però", lastName: "D'Amico" }),
    ).toBe("DMCPRE40C12D643W");
  });

  it("accepts a lowercase cadastral code", () => {
    expect(computeTaxCode({ ...MARIO, cadastralCode: " d643 " })).toBe(
      "RSSMRA40C12D643D",
    );
  });

  it("uses the month letter, not the number", () => {
    // March is the third code in ABCDEHLMPRST.
    expect(computeTaxCode(MARIO)?.[8]).toBe("C");
    expect(computeTaxCode({ ...MARIO, birthDate: "1940-01-12" })?.[8]).toBe("A");
    expect(computeTaxCode({ ...MARIO, birthDate: "1940-12-12" })?.[8]).toBe("T");
  });

  describe("returns null when the data is not enough", () => {
    it.for([
      ["empty first name", { firstName: "" }],
      ["first name with no letters", { firstName: "123" }],
      ["empty surname", { lastName: "  " }],
      ["date in Italian format", { birthDate: "12/03/1940" }],
      ["month 13", { birthDate: "1940-13-12" }],
      ["month 00", { birthDate: "1940-00-12" }],
      ["cadastral code too short", { cadastralCode: "XX1" }],
      ["empty cadastral code", { cadastralCode: "" }],
    ])("%s", ([, override]) => {
      expect(computeTaxCode({ ...MARIO, ...(override as object) })).toBeNull();
    });
  });

  /**
   * Documents current behaviour, not a rule of the decree: the date comes from
   * `<input type="date">`, which cannot produce a non-existent day, and
   * `practiceSchema` rejects one before this is ever called.
   */
  it("does not check the calendar: 31 February is accepted", () => {
    expect(computeTaxCode({ ...MARIO, birthDate: "1940-02-31" })).toBe(
      "RSSMRA40B31D643V",
    );
  });
});

describe("checkChar", () => {
  it("computes the sixteenth character", () => {
    expect(checkChar("RSSMRA40C12D643")).toBe("D");
    expect(checkChar("RSSMRA40C52D643")).toBe("H");
  });

  it("weighs odd and even positions differently", () => {
    // Swapping two adjacent characters changes the sum, and so the result.
    expect(checkChar("RSSMRA40C12D634")).not.toBe(checkChar("RSSMRA40C12D643"));
  });

  /**
   * Not defensive by design: every caller feeds it 15 uppercase characters
   * already validated by the tax-code regex. Pinned so that turning it into a
   * throw stays a deliberate decision.
   */
  it("returns undefined on input it was never meant to receive", () => {
    expect(checkChar("rssmra40c12d643")).toBeUndefined();
    expect(checkChar("RSS")).toBeUndefined();
  });
});
