import rawComuni from "./data/comuni.json";
import rawStati from "./data/stati.json";

/**
 * Where someone was born, died, lived, or is being taken: Italian
 * municipalities, and the foreign states beside them.
 *
 * The municipalities are stored compactly as `[name, province, cadastralCode]`,
 * the states as `[name, cadastralCode, ceased]`. Together the two files weigh
 * ~230 KB: they stay on the server and are queried through
 * `/api/municipalities` rather than shipping in every page bundle.
 *
 * Sources: https://github.com/matteocontrini/comuni-json (ISTAT data) for the
 * municipalities, scripts/build-stati.py for the states.
 */
export type Comune = {
  nome: string;
  /** Two letters, or "EE" for a foreign state, as the registry writes it. */
  provincia: string;
  codice: string;
  /** A foreign state rather than an Italian municipality. */
  estero?: boolean;
  /**
   * A state that no longer exists. Its code stays valid in the tax codes
   * already issued — someone born in Yugoslavia carries one on their health
   * card — so it has to be searchable, but it goes last.
   */
  storico?: boolean;
};

/** What the registry prints in place of a province for anywhere abroad. */
export const PROVINCIA_ESTERO = "EE";

const COMUNI: Comune[] = (rawComuni as [string, string, string][]).map(
  ([nome, provincia, codice]) => ({ nome, provincia, codice }),
);

const STATI: Comune[] = (rawStati as [string, string, number][]).map(
  ([nome, codice, storico]) => ({
    nome,
    provincia: PROVINCIA_ESTERO,
    codice,
    estero: true,
    ...(storico ? { storico: true } : {}),
  }),
);

/**
 * Municipalities first, then the states in use, then the ones that ceased to
 * exist. Someone typing "Germania" wants the country; someone typing "Roma"
 * wants the city, not Romania — and nobody typing "Serbia" wants Yugoslavia
 * offered first.
 */
const GRUPPI: Comune[][] = [
  COMUNI,
  STATI.filter((s) => !s.storico),
  STATI.filter((s) => s.storico),
];

/**
 * Exact name first, then prefix, then substring: people usually type from the
 * start, and whoever types a whole name means it.
 *
 * The exact tier exists for the states. Italian municipalities come before them
 * — the common case — but "Germania" typed in full would otherwise sit below
 * Germagnano, Germagno and Germignaga, three hamlets nobody was looking for.
 */
export function searchComuni(query: string, limit = 10): Comune[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const exact: Comune[] = [];
  const startsWith: Comune[] = [];
  const contains: Comune[] = [];

  // Walked group by group so the order above survives. Nothing is cut short:
  // the states are scanned even when the municipalities already fill the list,
  // because one of them may be the exact match that belongs on top.
  for (const gruppo of GRUPPI) {
    for (const c of gruppo) {
      const nome = c.nome.toLowerCase();
      if (nome === q) exact.push(c);
      else if (nome.startsWith(q)) startsWith.push(c);
      else if (nome.includes(q)) contains.push(c);
    }
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}

/**
 * The cadastral code is characters 12-15 of the tax code, so the birth place
 * can be recovered from it — a municipality, or the country for someone born
 * abroad, whose code starts with Z.
 */
const BY_CODE = new Map([...COMUNI, ...STATI].map((c) => [c.codice, c]));

export function comuneByCode(codice: string): Comune | null {
  return BY_CODE.get(codice.toUpperCase()) ?? null;
}

const STATI_BY_NAME = new Map(STATI.map((s) => [s.nome.toLowerCase(), s]));

export function provinciaOf(nome: string): string | null {
  const q = nome.trim().toLowerCase();
  // A foreign state has no Italian province: the registry writes "EE".
  if (STATI_BY_NAME.has(q)) return PROVINCIA_ESTERO;

  const found = COMUNI.filter((c) => c.nome.toLowerCase() === q);
  // Same name in different provinces: with no tie-breaker, pick nothing.
  return found.length === 1 ? found[0].provincia : null;
}
