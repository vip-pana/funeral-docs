import { afterEach, describe, expect, it, vi } from "vitest";

import { checkChar, computeTaxCode } from "./tax-code";
import {
  driverSchema,
  ownerSchema,
  parseTaxCode,
  practiceSchema,
  vehicleSchema,
} from "./validation";

/** A complete, valid practice: each test overrides the one field it is about. */
const PRACTICE = {
  personFirstName: "Mario",
  personLastName: "Rossi",
  personTaxCode: "RSSMRA40C12D643D",
  personBirthDate: "1940-03-12",
  personBirthCity: "Foggia",
  personResidenceCity: "San Severo",
  personResidenceAddress: "Via Roma 15",
  personDeathDate: "2026-08-04",
  personDeathTime: "14:30",
  personDeathCity: "San Severo",
  personDeathPlace: "Ospedale Masselli",
  transportDate: "2026-08-06",
  transportTime: "09:00",
  transportPermitDate: "2026-08-05",
  destinationCity: "Foggia",
  destinationProvince: "FG",
  destinationCemetery: "Cimitero Comunale",
};

const parse = (override: Record<string, unknown> = {}) =>
  practiceSchema.safeParse({ ...PRACTICE, ...override });

/** First error message for a field, or undefined when the field passed. */
const errorOn = (result: ReturnType<typeof parse>, field: string) =>
  result.success
    ? undefined
    : result.error.issues.find((i) => i.path[0] === field)?.message;

describe("parseTaxCode", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts birth date, sex and cadastral code", () => {
    expect(parseTaxCode("RSSMRA40C12D643D")).toEqual({
      birthDate: "1940-03-12",
      isFemale: false,
      cadastralCode: "D643",
    });
  });

  it("trims and uppercases what was pasted in", () => {
    expect(parseTaxCode("  rssmra40c12d643d ")?.birthDate).toBe("1940-03-12");
  });

  it("recognises a woman from the day above 40 and subtracts it", () => {
    expect(parseTaxCode("RSSMRA40C52D643H")).toEqual({
      birthDate: "1940-03-12",
      isFemale: true,
      cadastralCode: "D643",
    });
  });

  it("rejects a code with the wrong check character", () => {
    // Same as the valid one, last character changed.
    expect(parseTaxCode("RSSMRA40C12D643A")).toBeNull();
    expect(parseTaxCode("RSSMRA40C52D643U")).toBeNull();
  });

  it("rejects something that is not a tax code", () => {
    expect(parseTaxCode("ABC")).toBeNull();
    expect(parseTaxCode("")).toBeNull();
  });

  describe("omocodia: letters standing in for digits", () => {
    it("decodes a letter in the day", () => {
      // "1M" is 11: M stands for 1.
      expect(parseTaxCode(valid("RSSMRA40C1MD643"))?.birthDate).toBe(
        "1940-03-11",
      );
    });

    it("decodes a letter in the year", () => {
      // "Q0" is 40: Q stands for 4.
      expect(parseTaxCode(valid("RSSMRAQ0C12D643"))?.birthDate).toBe(
        "1940-03-12",
      );
    });

    /**
     * Known limitation: the substitution is not undone in the cadastral code,
     * so `comuneByCode` will not find the municipality and the birth city stays
     * empty. The field is editable, so the user fills it in by hand.
     */
    it("leaves the letter in the cadastral code", () => {
      expect(parseTaxCode(valid("RSSMRA40C12D64P"))?.cadastralCode).toBe(
        "D64P",
      );
    });
  });

  describe("day out of range", () => {
    it.for([
      ["day 00", "RSSMRA40C00D643"],
      // 40 is neither a man's day nor a woman's: >40 is what marks a woman.
      ["day 40", "RSSMRA40C40D643"],
      ["day 72, which is 32 for a woman", "RSSMRA40C72D643"],
      ["31 February", "RSSMRA40B31D643"],
    ])("rejects %s", ([, code15]) => {
      expect(parseTaxCode(valid(code15))).toBeNull();
    });

    it("accepts day 41, which is the first of the month for a woman", () => {
      expect(parseTaxCode(valid("RSSMRA40C41D643"))).toEqual({
        birthDate: "1940-03-01",
        isFemale: true,
        cadastralCode: "D643",
      });
    });
  });

  /**
   * The code carries two year digits only, so the century is guessed against
   * today's: anything up to the current two digits is read as the 2000s. The
   * clock is frozen because the boundary moves every year.
   */
  describe("century boundary", () => {
    it("reads a year up to the current one as the 2000s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-07T12:00:00Z"));
      expect(parseTaxCode(valid("RSSMRA26C12D643"))?.birthDate).toBe(
        "2026-03-12",
      );
    });

    it("reads a later year as the 1900s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-07T12:00:00Z"));
      expect(parseTaxCode(valid("RSSMRA27C12D643"))?.birthDate).toBe(
        "1927-03-12",
      );
    });
  });

  it("recovers what computeTaxCode produced", () => {
    for (const isFemale of [false, true]) {
      const code = computeTaxCode({
        firstName: PRACTICE.personFirstName,
        lastName: PRACTICE.personLastName,
        birthDate: PRACTICE.personBirthDate,
        cadastralCode: "D643",
        isFemale,
      })!;
      expect(parseTaxCode(code)).toEqual({
        birthDate: PRACTICE.personBirthDate,
        isFemale,
        cadastralCode: "D643",
      });
    }
  });
});

describe("practiceSchema", () => {
  it("accepts a complete practice", () => {
    expect(parse().success).toBe(true);
  });

  it("defaults the sex to M, which is never printed anyway", () => {
    const result = parse();
    expect(result.success && result.data.personSex).toBe("M");
  });

  it("treats the church as optional and turns it into an empty string", () => {
    const result = parse();
    expect(result.success && result.data.funeralChurch).toBe("");
  });

  it("uppercases the province", () => {
    const result = parse({ destinationProvince: " fg " });
    expect(result.success && result.data.destinationProvince).toBe("FG");
  });

  it("rejects a province that is not two letters", () => {
    expect(errorOn(parse({ destinationProvince: "Foggia" }), "destinationProvince"))
      .toMatch(/2 lettere/);
  });

  it("rejects a tax code whose check character does not match", () => {
    expect(errorOn(parse({ personTaxCode: "RSSMRA40C12D643A" }), "personTaxCode"))
      .toMatch(/copiato bene/);
  });

  it("rejects a missing required field", () => {
    expect(errorOn(parse({ personFirstName: "   " }), "personFirstName"))
      .toMatch(/obbligatorio/);
  });

  describe("dates", () => {
    it("rejects a date that does not exist", () => {
      expect(errorOn(parse({ personDeathDate: "2026-02-31" }), "personDeathDate"))
        .toBe("Data inesistente");
    });

    it("accepts 29 February in a leap year and rejects it otherwise", () => {
      expect(parse({ personDeathDate: "2024-02-29" }).success).toBe(true);
      expect(errorOn(parse({ personDeathDate: "2026-02-29" }), "personDeathDate"))
        .toBe("Data inesistente");
    });

    it("rejects a date in Italian format", () => {
      expect(errorOn(parse({ personBirthDate: "12/03/1940" }), "personBirthDate"))
        .toBe("Data non valida");
    });
  });

  describe("times", () => {
    it("rejects an hour or minute out of range", () => {
      expect(errorOn(parse({ transportTime: "99:99" }), "transportTime"))
        .toBe("Ora inesistente");
      expect(errorOn(parse({ transportTime: "24:00" }), "transportTime"))
        .toBe("Ora inesistente");
    });

    it("accepts midnight and the last minute of the day", () => {
      expect(parse({ transportTime: "00:00" }).success).toBe(true);
      expect(parse({ transportTime: "23:59" }).success).toBe(true);
    });

    it("requires two digits for the hour", () => {
      expect(errorOn(parse({ transportTime: "9:00" }), "transportTime"))
        .toMatch(/hh:mm/);
    });
  });

  /**
   * The Selects submit an empty string when nothing is picked, and that has to
   * survive as "none chosen" rather than reaching the database.
   */
  describe("vehicleId and driverId", () => {
    const UUID = "80801b37-00c8-413c-8df3-eab61984f30c";

    it("turns an empty string into undefined", () => {
      const result = parse({ vehicleId: "", driverId: "" });
      expect(result.success && result.data.vehicleId).toBeUndefined();
      expect(result.success && result.data.driverId).toBeUndefined();
    });

    it("keeps a uuid as it is", () => {
      const result = parse({ vehicleId: UUID, driverId: UUID });
      expect(result.success && result.data.vehicleId).toBe(UUID);
      expect(result.success && result.data.driverId).toBe(UUID);
    });

    it("treats a blank field as nothing chosen", () => {
      const result = parse({ vehicleId: "   " });
      expect(result.success && result.data.vehicleId).toBeUndefined();
    });

    /**
     * The shape is not validated here: the server re-reads the row and nulls an
     * id that matches nothing, so a garbage value never reaches the column.
     */
    it("accepts an id that is not a uuid, for the server to reject", () => {
      const result = parse({ vehicleId: "abc" });
      expect(result.success && result.data.vehicleId).toBe("abc");
    });
  });
});

describe("ownerSchema", () => {
  const OWNER = {
    ownerFirstName: "Mario",
    ownerLastName: "Rossi",
    ownerCompanyName: "OO.FF. Rossi",
    ownerCompanyCity: "San Severo",
    ownerCity: "San Severo",
    ownerCityName: "San Severo",
  };

  it("accepts the company data without the optional fields", () => {
    const result = ownerSchema.safeParse(OWNER);
    expect(result.success).toBe(true);
    // The middle name is optional and becomes an empty string.
    expect(result.success && result.data.ownerMiddleName).toBe("");
  });

  it("no longer knows about the driver, which now lives on the practice", () => {
    expect(Object.keys(ownerSchema.shape)).not.toContain("ownerDriverName");
  });

  it("keeps an empty request date as it is", () => {
    const result = ownerSchema.safeParse({ ...OWNER, ownerRequestDate: "" });
    expect(result.success && result.data.ownerRequestDate).toBe("");
  });
});

describe("vehicleSchema and driverSchema", () => {
  it("normalises the plate to uppercase", () => {
    const result = vehicleSchema.safeParse({
      name: "Mercedes Vito",
      plate: " fg123ab ",
    });
    expect(result.success && result.data.plate).toBe("FG123AB");
  });

  it("rejects a blank plate", () => {
    expect(vehicleSchema.safeParse({ name: "Vito", plate: "   " }).success).toBe(
      false,
    );
  });

  it("accepts a driver and trims the name", () => {
    const result = driverSchema.safeParse({ name: " Giuseppe Bianchi " });
    expect(result.success && result.data.name).toBe("Giuseppe Verdi");
  });

  it("rejects a blank driver name", () => {
    expect(driverSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});

/**
 * Completes a 15-character code with its check character, so the fixtures are
 * built from the rule instead of being pasted in: a hand-typed 16th character
 * would make a test fail for the wrong reason. The check character itself is
 * asserted in tax-code.test.ts, not here.
 */
function valid(code15: string): string {
  return code15 + checkChar(code15);
}
