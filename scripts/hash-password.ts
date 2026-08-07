/**
 * Genera l'hash bcrypt da mettere in AUTH_PASSWORD_HASH.
 *
 *   pnpm auth:hash 'la-mia-password'
 *
 * La password in chiaro non viene mai scritta su disco: solo l'hash finisce
 * nel .env.
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Uso: pnpm auth:hash '<password>'");
  process.exit(1);
}

if (password.length < 8) {
  console.error("La password deve essere di almeno 8 caratteri.");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);

/**
 * Il parser .env di Next espande `$xxx` come riferimento a variabile, anche
 * dentro apici singoli: un hash bcrypt incollato cosi' com'e' arriva troncato
 * al primo `$` e la password non corrisponde mai. Ogni `$` va preceduto da `\`.
 */
const escaped = hash.replace(/\$/g, "\\$");

console.log("\nAggiungi al .env — i \\$ sono necessari, non un errore:\n");
console.log(`AUTH_PASSWORD_HASH="${escaped}"`);
console.log();
