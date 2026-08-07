import { describe, expect, it } from "vitest";

import { comuneByCode, provinciaOf, searchComuni } from "./comuni";

/**
 * The dataset is the vendored ISTAT list (src/lib/data/comuni.json), so these
 * assertions hold offline. They name real municipalities on purpose: a rebuilt
 * dataset that lost them should fail here.
 */

describe("searchComuni", () => {
  it("finds a municipality by prefix", () => {
    expect(searchComuni("fogg")).toEqual([
      { nome: "Foggia", provincia: "FG", codice: "D643" },
    ]);
  });

  it("ignores case and surrounding spaces", () => {
    expect(searchComuni("  FOGG  ")[0]?.nome).toBe("Foggia");
  });

  it("needs at least two characters, so the list is not dumped", () => {
    expect(searchComuni("f")).toEqual([]);
    expect(searchComuni(" ")).toEqual([]);
  });

  it("honours the limit", () => {
    expect(searchComuni("san", 3)).toHaveLength(3);
  });

  it("puts prefix matches before substring matches", () => {
    // "Pisa" and "Pisano" start with it; "Vicopisano" only contains it.
    const names = searchComuni("pisa", 5).map((c) => c.nome);
    expect(names.slice(0, 2)).toEqual(["Pisa", "Pisano"]);
    expect(names).toContain("Vicopisano");
  });

  it("still matches in the middle of the name", () => {
    expect(searchComuni("severo", 5).map((c) => c.nome)).toContain(
      "San Severo",
    );
  });

  /**
   * The scan stops as soon as the limit is reached in prefix matches, so a
   * common beginning never surfaces substring results. Documented because it is
   * what keeps a query like "san" from walking the whole list.
   */
  it("does not reach substring matches when prefixes already fill the limit", () => {
    expect(
      searchComuni("castel", 5).every((c) =>
        c.nome.toLowerCase().startsWith("castel"),
      ),
    ).toBe(true);
  });

  it("returns nothing for a name that does not exist", () => {
    expect(searchComuni("Borgo Inventato")).toEqual([]);
  });
});

describe("comuneByCode", () => {
  it("recovers the municipality from the cadastral code", () => {
    expect(comuneByCode("D643")).toEqual({
      nome: "Foggia",
      provincia: "FG",
      codice: "D643",
    });
  });

  it("uppercases the code, as it arrives from a tax code typed in lowercase", () => {
    expect(comuneByCode("d643")?.nome).toBe("Foggia");
  });

  it("returns null for an unknown code", () => {
    expect(comuneByCode("ZZZZ")).toBeNull();
    expect(comuneByCode("")).toBeNull();
  });
});

describe("provinciaOf", () => {
  it("resolves the province from the name", () => {
    expect(provinciaOf("Foggia")).toBe("FG");
    expect(provinciaOf(" san severo ")).toBe("FG");
  });

  /**
   * Six names are shared by two municipalities in different provinces. With
   * nothing to tell them apart the field is left empty rather than guessed.
   */
  it("returns null when the name is ambiguous", () => {
    expect(provinciaOf("Castro")).toBeNull();
    expect(provinciaOf("San Teodoro")).toBeNull();
  });

  it("returns null for a name that does not exist", () => {
    expect(provinciaOf("Borgo Inventato")).toBeNull();
  });
});
