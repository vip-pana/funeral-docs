import { describe, expect, it } from "vitest";

import { ALL_FIELDS } from "@/lib/fields";

import { ageAt, documentFileName, formatDate, prepareValues } from "./render";

/**
 * `renderDocument` is left out: it reads the .docx files from disk and is
 * already covered end-to-end by tests/pratiche.mjs, which downloads the real
 * documents and inspects their text.
 */

describe("formatDate", () => {
  it("turns ISO into the Italian format", () => {
    expect(formatDate("1940-03-12")).toBe("12/03/1940");
  });

  it("passes through anything that is not ISO", () => {
    expect(formatDate("12/03/1940")).toBe("12/03/1940");
    expect(formatDate("")).toBe("");
    // Single digits are not matched, so the string comes back untouched.
    expect(formatDate("1940-3-2")).toBe("1940-3-2");
  });

  it("drops surrounding spaces when it converts", () => {
    expect(formatDate(" 1940-03-12 ")).toBe("12/03/1940");
  });
});

describe("ageAt", () => {
  it("counts the years completed by the date of death", () => {
    expect(ageAt("1940-03-12", "2026-08-04")).toBe("86");
  });

  it("does not count a birthday that had not come round yet", () => {
    expect(ageAt("1940-08-05", "2026-08-04")).toBe("85");
    // On the birthday itself the year is complete.
    expect(ageAt("1940-08-04", "2026-08-04")).toBe("86");
  });

  it("handles someone born on 29 February", () => {
    // The birthday had not come round in a year without a 29th.
    expect(ageAt("1940-02-29", "2026-02-28")).toBe("85");
    expect(ageAt("1940-02-29", "2026-03-01")).toBe("86");
  });

  it("gives nothing when either date is missing or malformed", () => {
    expect(ageAt("", "2026-08-04")).toBe("");
    expect(ageAt("1940-03-12", "")).toBe("");
    expect(ageAt("12/03/1940", "2026-08-04")).toBe("");
  });

  /** Data entry gone wrong: better a blank than "di anni -3" on a mandate. */
  it("gives nothing when the death comes before the birth", () => {
    expect(ageAt("2026-08-04", "1940-03-12")).toBe("");
  });
});

describe("prepareValues", () => {
  it("emits every template field, so no placeholder survives in print", () => {
    const out = prepareValues({});
    expect(Object.keys(out).sort()).toEqual([...ALL_FIELDS].sort());
    expect(Object.values(out).every((v) => v === "")).toBe(true);
  });

  it("converts the date fields and leaves the others alone", () => {
    const out = prepareValues({
      personBirthDate: "1940-03-12",
      personDeathDate: "2026-08-04",
      transportDate: "2026-08-06",
      transportPermitDate: "2026-08-05",
      ownerRequestDate: "2026-08-05",
      burialPermitDate: "2026-08-05",
      todayDate: "2026-08-07",
      // Times are not dates: they must not be touched.
      personDeathTime: "14:30",
      transportTime: "09:00",
      personLastName: "Rossi",
    });

    expect(out.personBirthDate).toBe("12/03/1940");
    expect(out.personDeathDate).toBe("04/08/2026");
    expect(out.transportDate).toBe("06/08/2026");
    expect(out.transportPermitDate).toBe("05/08/2026");
    expect(out.ownerRequestDate).toBe("05/08/2026");
    expect(out.burialPermitDate).toBe("05/08/2026");
    expect(out.todayDate).toBe("07/08/2026");
    expect(out.personDeathTime).toBe("14:30");
    expect(out.transportTime).toBe("09:00");
    expect(out.personLastName).toBe("Rossi");
  });

  /**
   * Load-bearing: the generation route spreads the whole database row in, which
   * carries `id`, `updatedAt` and the snapshot columns. Letting them through
   * would hand docxtemplater fields that no template declares.
   */
  it("drops keys that are not template fields", () => {
    const out = prepareValues({
      id: 12,
      updatedAt: "2026-08-07 10:00:00",
      vehiclePlate: "FG123AB",
      driverName: "Giuseppe Verdi",
    } as never);

    expect(out).not.toHaveProperty("id");
    expect(out).not.toHaveProperty("updatedAt");
    expect(out).not.toHaveProperty("vehiclePlate");
    expect(out).not.toHaveProperty("driverName");
  });
});

describe("documentFileName", () => {
  it("builds COGNOME_Nome_data_documento_titolo.docx", () => {
    expect(
      documentFileName(
        {
          personLastName: "Rossi",
          personFirstName: "Mario",
          personDeathDate: "2026-08-04",
        },
        "1",
      ),
    ).toBe(
      "ROSSI_Mario_2026-08-04_1_Comunicazione-di-autorizzazione-al-trasporto.docx",
    );
  });

  it("keeps the B code of the documents that have one", () => {
    expect(
      documentFileName(
        { personLastName: "Rossi", personDeathDate: "2026-08-04" },
        "4",
      ),
    ).toBe("ROSSI_2026-08-04_4_B5-Modulo-di-chiusura-feretro.docx");
  });

  it("flattens the em dash of the Allegato titles", () => {
    expect(documentFileName({ personLastName: "Rossi" }, "6")).toBe(
      "ROSSI_6_Allegato-2-Richiesta-di-autorizzazione-al-trasporto.docx",
    );
  });

  it("keeps the date in ISO, unlike the document contents", () => {
    const name = documentFileName({ personDeathDate: "2026-08-04" }, "2");
    expect(name).toContain("2026-08-04");
    expect(name).not.toContain("04/08/2026");
  });

  it("strips accents and turns punctuation into hyphens", () => {
    expect(
      documentFileName(
        { personLastName: "D'Amico", personFirstName: "José Maria" },
        "3",
      ),
    ).toBe("D-AMICO_Jose-Maria_3_Domanda-di-autorizzazione-al-trasporto.docx");
  });

  it("falls back to the transport date when there is no death date", () => {
    expect(
      documentFileName(
        { personLastName: "Rossi", transportDate: "2026-01-02" },
        "3",
      ),
    ).toBe("ROSSI_2026-01-02_3_Domanda-di-autorizzazione-al-trasporto.docx");
  });

  it("names the file even with no data at all", () => {
    expect(documentFileName({}, "4")).toBe(
      "SENZA-NOME_4_B5-Modulo-di-chiusura-feretro.docx",
    );
  });

  it("falls back when the surname has no usable characters", () => {
    expect(documentFileName({ personLastName: "---" }, "2")).toBe(
      "SENZA-NOME_2_B4-Autorizzazione-al-trasporto-in-altro-comune.docx",
    );
  });

  it("never leaves an empty section between underscores", () => {
    // No first name: the gap is closed rather than producing "ROSSI__2026…".
    expect(
      documentFileName(
        { personLastName: "Rossi", personDeathDate: "2026-08-04" },
        "5",
      ),
    ).toBe("ROSSI_2026-08-04_5_Riconoscimento-di-cadavere-e-suggellamento.docx");
  });
});
