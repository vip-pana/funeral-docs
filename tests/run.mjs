/**
 * Runs every suite in sequence and summarises the outcome.
 * Requires an instance already listening (see tests/README.md).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const suites = [
  "login.mjs",
  "interfaccia.mjs",
  "impostazioni.mjs",
  "veicoli.mjs",
  "pratiche.mjs",
  "comuni.mjs",
  "codice-fiscale.mjs",
  "api.mjs",
  "elimina.mjs",
];
const base = process.env.BASE_URL ?? "http://localhost:3000";

const failed = [];

for (const suite of suites) {
  console.log(`\n──────── ${suite} ────────`);
  const code = await new Promise((resolve) => {
    spawn(process.execPath, [join(here, suite)], {
      stdio: "inherit",
      env: process.env,
    }).on("close", resolve);
  });
  if (code !== 0) failed.push(suite);
}

console.log(`\n════════ ${base} ════════`);
if (failed.length) {
  console.log(`FALLITE: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`Tutte le ${suites.length} suite sono passate.`);
