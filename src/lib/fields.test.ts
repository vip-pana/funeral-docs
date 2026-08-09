import { describe, expect, it } from "vitest";

import {
  ALL_FIELDS,
  DOCUMENTS,
  FIELD_LABELS,
  OWNER_FIELDS,
  PRACTICE_FIELDS,
  PRACTICE_SECTIONS,
  SYSTEM_FIELDS,
} from "./fields";

/**
 * The field list and the .docx placeholders are kept in sync by hand, and
 * `pnpm check:templates` compares them against the real templates. These tests
 * cover the invariants inside the file itself, which that script assumes.
 */

describe("ALL_FIELDS", () => {
  it("is the three lists joined", () => {
    expect(ALL_FIELDS).toEqual([
      ...OWNER_FIELDS,
      ...PRACTICE_FIELDS,
      ...SYSTEM_FIELDS,
    ]);
  });

  it("has no duplicates: a rename collision would go unnoticed", () => {
    expect(new Set(ALL_FIELDS).size).toBe(ALL_FIELDS.length);
  });

  /**
   * The plate and the driver name keep their `owner*` prefix because that is
   * what the .docx files contain, even though the values now come from the
   * practice. Renaming them here without renaming them in the templates would
   * leave a hole in the printed documents.
   */
  it("still declares the fields the practice supplies", () => {
    expect(OWNER_FIELDS).toContain("ownerVehiclePlate");
    expect(OWNER_FIELDS).toContain("ownerDriverName");
  });

  /** Only feeds the tax code computation, so it must never reach a template. */
  it("does not contain personSex", () => {
    expect(ALL_FIELDS).not.toContain("personSex");
  });
});

describe("FIELD_LABELS", () => {
  it("labels exactly the declared fields, no more and no fewer", () => {
    // TypeScript catches a missing key; only an extra one can slip through,
    // after a field is removed from the list but not from here.
    expect(Object.keys(FIELD_LABELS).sort()).toEqual([...ALL_FIELDS].sort());
  });

  it("has no empty label", () => {
    expect(Object.values(FIELD_LABELS).every((l) => l.trim().length > 0)).toBe(
      true,
    );
  });
});

describe("PRACTICE_SECTIONS", () => {
  it("only lists fields that exist", () => {
    for (const section of PRACTICE_SECTIONS) {
      for (const field of section.fields) {
        expect(PRACTICE_FIELDS).toContain(field);
      }
    }
  });

  it("never shows the same field twice", () => {
    const shown = PRACTICE_SECTIONS.flatMap((s) => s.fields);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it("has unique ids", () => {
    const ids = PRACTICE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("DOCUMENTS", () => {
  it("names each file after its id", () => {
    for (const doc of DOCUMENTS) {
      expect(doc.file).toBe(`${doc.id}.docx`);
    }
  });

  it("has unique ids", () => {
    const ids = DOCUMENTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every document a title", () => {
    expect(DOCUMENTS.every((d) => d.title.trim().length > 0)).toBe(true);
  });

  it("has titles that stay distinct once slugified into a file name", () => {
    const slugs = DOCUMENTS.map((d) =>
      d.title
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^A-Za-z0-9]+/g, "-"),
    );
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
