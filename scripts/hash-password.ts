/**
 * Generates the bcrypt hash to put in AUTH_PASSWORD_HASH.
 *
 *   pnpm auth:hash 'la-mia-password'
 *
 * The plaintext password is never written to disk: only the hash ends up in
 * the .env.
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
console.log();
