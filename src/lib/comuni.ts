import raw from "./data/comuni.json";

/**
 * Comuni italiani, in forma compatta `[nome, sigla, codiceCatastale]`.
 *
 * Il file pesa ~200 KB: resta sul server e viene interrogato via
 * `/api/comuni`, invece di finire nel bundle di ogni pagina.
 *
 * Fonte: https://github.com/matteocontrini/comuni-json (dati ISTAT).
 */
export type Comune = { nome: string; provincia: string; codice: string };

const COMUNI: Comune[] = (raw as [string, string, string][]).map(
  ([nome, provincia, codice]) => ({ nome, provincia, codice }),
);

/** Cerca per prefisso, poi per contenuto: chi digita di solito inizia dal nome. */
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
 * Comune dal codice catastale: sono i caratteri 12-15 del codice fiscale,
 * quindi il comune di nascita si ricava dal CF.
 */
const BY_CODE = new Map(COMUNI.map((c) => [c.codice, c]));

export function comuneByCode(codice: string): Comune | null {
  return BY_CODE.get(codice.toUpperCase()) ?? null;
}

/** Sigla della provincia per un nome di comune, se esiste ed e' univoco. */
export function provinciaOf(nome: string): string | null {
  const q = nome.trim().toLowerCase();
  const found = COMUNI.filter((c) => c.nome.toLowerCase() === q);
  // Comuni omonimi in province diverse: senza un criterio non si sceglie.
  return found.length === 1 ? found[0].provincia : null;
}
