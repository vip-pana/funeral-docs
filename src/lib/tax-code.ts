/**
 * Calcolo del codice fiscale (DM 23/12/1976).
 *
 * Serve a proporre un valore, non a sostituire il documento: il codice reale
 * puo' differire per omocodia, cioe' quando due persone producono lo stesso
 * codice e l'Agenzia delle Entrate ne assegna una variante. Il campo resta
 * quindi modificabile e la proposta va confrontata con la tessera sanitaria.
 */

const VOWELS = "AEIOU";
const MONTH_CODES = "ABCDEHLMPRST";

/** Peso di ogni carattere in posizione dispari (1ª, 3ª, …), come da decreto. */
const ODD: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4,
  M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22,
  X: 25, Y: 24, Z: 23,
};

/** In posizione pari il peso e' semplicemente la posizione nell'alfabeto. */
const EVEN: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11,
  M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22,
  X: 23, Y: 24, Z: 25,
};

const CHECK_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Toglie accenti, apostrofi e spazi: "D'Amico Però" -> "DAMICOPERO". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Tre lettere dal cognome: consonanti, poi vocali. Se non bastano si riempie
 * con X.
 */
function surnameCode(surname: string): string {
  const s = normalize(surname);
  const consonants = [...s].filter((c) => !VOWELS.includes(c));
  const vowels = [...s].filter((c) => VOWELS.includes(c));
  return (consonants.join("") + vowels.join("") + "XXX").slice(0, 3);
}

/**
 * Tre lettere dal nome. Con quattro o piu' consonanti si prendono la prima,
 * la terza e la quarta — non le prime tre.
 */
function firstNameCode(firstName: string): string {
  const s = normalize(firstName);
  const consonants = [...s].filter((c) => !VOWELS.includes(c));
  const vowels = [...s].filter((c) => VOWELS.includes(c));

  if (consonants.length >= 4) {
    return consonants[0] + consonants[2] + consonants[3];
  }
  return (consonants.join("") + vowels.join("") + "XXX").slice(0, 3);
}

/** Anno (2 cifre), mese (lettera), giorno (+40 per le donne). */
function birthCode(isoDate: string, isFemale: boolean): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;

  const [, year, month, day] = m;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;

  const dayNum = Number(day) + (isFemale ? 40 : 0);
  return year.slice(2) + MONTH_CODES[monthIndex] + String(dayNum).padStart(2, "0");
}

/** Carattere di controllo: somma pesata delle prime 15 posizioni, modulo 26. */
export function checkChar(code15: string): string {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = code15[i];
    // Le posizioni si contano da 1: l'indice 0 e' dispari.
    sum += i % 2 === 0 ? ODD[c] : EVEN[c];
  }
  return CHECK_CHARS[sum % 26];
}

export type TaxCodeInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  /** Codice catastale del comune di nascita (es. D643). */
  cadastralCode: string;
  isFemale: boolean;
};

/** Restituisce il codice fiscale, o null se i dati non bastano. */
export function computeTaxCode({
  firstName,
  lastName,
  birthDate,
  cadastralCode,
  isFemale,
}: TaxCodeInput): string | null {
  if (!normalize(firstName) || !normalize(lastName)) return null;

  const born = birthCode(birthDate, isFemale);
  if (!born) return null;

  const place = cadastralCode.trim().toUpperCase();
  if (!/^[A-Z]\d{3}$/.test(place)) return null;

  const partial =
    surnameCode(lastName) + firstNameCode(firstName) + born + place;

  return partial + checkChar(partial);
}
