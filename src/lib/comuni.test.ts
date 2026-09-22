import { describe, expect, it } from "vitest";

import { comuneByCode, provinciaOf, searchComuni } from "./comuni";

/**
 * Two vendored datasets: the ISTAT municipalities (src/lib/data/comuni.json)
 * and the foreign states (src/lib/data/stati.json), so these assertions hold
 * offline. They name real places on purpose: a rebuilt dataset that lost them
 * should fail here.
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
   * With enough prefix matches to fill the limit, the substring ones never make
   * it into the result: they are collected but cut off by the slice.
   */
  it("drops substring matches when prefixes already fill the limit", () => {
    expect(
      searchComuni("castel", 5).every((c) =>
        c.nome.toLowerCase().startsWith("castel"),
      ),
    ).toBe(true);
  });

  it("returns nothing for a name that does not exist", () => {
    expect(searchComuni("Borgo Inventato")).toEqual([]);
  });

  it("finds a foreign state", () => {
    expect(searchComuni("germania")[0]).toEqual({
      nome: "Germania",
      provincia: "EE",
      codice: "Z112",
      estero: true,
    });
  });

  /**
   * An exact name wins over a prefix, and it is the states that need it:
   * "Germania" typed in full would otherwise sit below Germagnano, Germagno and
   * Germignaga, three hamlets nobody was looking for.
   */
  it("puts an exact match first, whichever list it comes from", () => {
    expect(searchComuni("germania")[0]?.nome).toBe("Germania");
    expect(searchComuni("roma")[0]?.nome).toBe("Roma");
  });

  /** Municipalities are the common case, so a shared prefix favours them. */
  it("offers municipalities before states on a shared prefix", () => {
    const names = searchComuni("germ", 5).map((c) => c.nome);
    expect(names.indexOf("Germagnano")).toBeLessThan(names.indexOf("Germania"));
  });

  /**
   * Their codes stay valid in the tax codes already issued, so they have to be
   * searchable — but below the states that still exist.
   */
  it("keeps states that ceased to exist, and puts them last", () => {
    const iugoslavia = searchComuni("iugoslavia")[0];
    expect(iugoslavia?.codice).toBe("Z118");
    expect(iugoslavia?.storico).toBe(true);

    const names = searchComuni("germania", 5).map((c) => c.nome);
    expect(names.indexOf("Germania")).toBeLessThan(
      names.indexOf("Germania Repubblica Democratica"),
    );
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
    // Starts with Z like a foreign state, but is not one of them.
    expect(comuneByCode("ZZZZ")).toBeNull();
    expect(comuneByCode("")).toBeNull();
  });

  /**
   * Someone born abroad carries the code of their country where a municipality
   * would be. Without this the tax code they paste fills nothing in.
   */
  it("recovers a foreign state from its code", () => {
    expect(comuneByCode("Z112")?.nome).toBe("Germania");
    expect(comuneByCode("Z404")?.nome).toBe("Stati Uniti d'America");
    // A state that no longer exists, from a tax code issued decades ago.
    expect(comuneByCode("Z135")?.nome).toBe("URSS");
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

  /** Anywhere abroad: what the registry writes in place of a province. */
  it("answers EE for a foreign state", () => {
    expect(provinciaOf("Germania")).toBe("EE");
    expect(provinciaOf("  stati uniti d'america ")).toBe("EE");
    expect(provinciaOf("URSS")).toBe("EE");
  });
});
