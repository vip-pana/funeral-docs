/**
 * Runs every suite in sequence and summarises the outcome.
 * Requires an instance already listening (see tests/README.md).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const suites = [
  "login.mts",
  "interfaccia.mts",
  "risorse.mts",
  // Before the suites that create a record: they need a client to pick.
  "clienti.mts",
  "veicoli.mts",
  "conducenti.mts",
  "contratto.mts",
  "mobile.mts",
  "allegati.mts",
  "pratiche.mts",
  "comuni.mts",
  "codice-fiscale.mts",
  "api.mts",
  "elimina.mts",
  // Last: it changes the shared password, which every other suite logs in
  // with. It puts the original back, but a crash midway would lock out
  // whatever ran after it.
  "impostazioni.mts",
];
const base = process.env.BASE_URL ?? "http://localhost:3000";

const failed: string[] = [];

for (const suite of suites) {
  console.log(`\n──────── ${suite} ────────`);
  // Through tsx, like this runner: the suites are TypeScript too.
  const code = await new Promise<number | null>((resolve) => {
    spawn(process.execPath, ["--import", "tsx", join(here, suite)], {
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
