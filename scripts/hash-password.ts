/**
 * Generates the bcrypt hash to put in AUTH_PASSWORD_HASH.
 *
 *   pnpm auth:hash 'la-mia-password'
 *
 * The plaintext password is never written to disk: only the hash ends up in
 * the .env.
 *
 * Needed to set the first password, and to recover access if it is lost — in
 * that case delete the `auth` row too, or the environment variable is ignored.
 * Day to day the password is changed from Impostazioni.
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
 * Next's .env parser expands `$xxx` as a variable reference, even inside
 * single quotes: a bcrypt hash pasted as-is arrives truncated at the first `$`
 * and the password never matches. Every `$` must be escaped with `\`.
 */
const escaped = hash.replace(/\$/g, "\\$");

console.log("\nAggiungi al .env — i \\$ sono necessari, non un errore:\n");
console.log(`AUTH_PASSWORD_HASH="${escaped}"`);
console.log(
  "\nServe solo al primo avvio: da lì in poi la password vive nel database\n" +
    "e si cambia da Impostazioni. Modificare questa riga non ha più effetto.",
);
console.log();
