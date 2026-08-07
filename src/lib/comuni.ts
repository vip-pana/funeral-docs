import raw from "./data/comuni.json";

/**
 * Italian municipalities, stored compactly as `[name, province, cadastralCode]`.
 *
 * The file weighs ~200 KB: it stays on the server and is queried through
 * `/api/municipalities` rather than shipping in every page bundle.
 *
 * Source: https://github.com/matteocontrini/comuni-json (ISTAT data).
 */
export type Comune = { nome: string; provincia: string; codice: string };

const COMUNI: Comune[] = (raw as [string, string, string][]).map(
  ([nome, provincia, codice]) => ({ nome, provincia, codice }),
);

/** Prefix matches first, then substring: people usually type from the start. */
export function searchComuni(query: string, limit = 10): Comune[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const startsWith: Comune[] = [];
  const contains: Comune[] = [];

  for (const c of COMUNI) {
    const nome = c.nome.toLowerCase();
    if (nome.startsWith(q)) startsWith.push(c);
    else if (nome.includes(q)) contains.push(c);
    if (startsWith.length >= limit) break;
  }

  return [...startsWith, ...contains].slice(0, limit);
}

/**
 * The cadastral code is characters 12-15 of the tax code, so the birth
 * municipality can be recovered from it.
 */
const BY_CODE = new Map(COMUNI.map((c) => [c.codice, c]));

export function comuneByCode(codice: string): Comune | null {
  return BY_CODE.get(codice.toUpperCase()) ?? null;
}

export function provinciaOf(nome: string): string | null {
  const q = nome.trim().toLowerCase();
  const found = COMUNI.filter((c) => c.nome.toLowerCase() === q);
  // Same name in different provinces: with no tie-breaker, pick nothing.
  return found.length === 1 ? found[0].provincia : null;
}
