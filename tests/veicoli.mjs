import { chromium } from "playwright-core";
import JSZip from "jszip";

import { fillPractice, login, SAMPLE } from "./helpers.mjs";

/**
 * Elenco autofunebri e targa copiata sulla pratica.
 *
 * Il controllo centrale e' il 7: eliminata l'autofunebre, la targa deve
 * restare nei documenti gia' emessi. E' la ragione per cui la pratica
 * conserva una copia della targa invece del solo riferimento.
 *
 * Gira prima di pratiche.mjs, che riusa il veicolo lasciato qui.
 */

const B = process.env.BASE_URL ?? "http://localhost:3000";
const PLATE = "FG123AB";
const NAME = "Mercedes Vito";

const b = await chromium.launch({ channel: "chrome" });
try {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 960 } })).newPage();
  p.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0, 160)));

  let fail = 0;
  const check = (n, c, x = "") => {
    console.log(c ? "ok  " : "FAIL", n, x);
    if (!c) fail++;
  };

  const plateText = async () => (await p.textContent("body")) ?? "";

  await login(p, B);
  await p.goto(`${B}/impostazioni`);
  await p.waitForTimeout(700);

  check("1 card Autofunebri presente", (await plateText()).includes("Autofunebri"));

  // Rimuove le autofunebri lasciate da esecuzioni precedenti: la suite ne
  // ricrea una in coda, e senza pulizia se ne accumulerebbero.
  for (let i = 0; i < 10; i++) {
    const stale = p.locator("tr", { hasText: PLATE }).first();
    if (!(await stale.count())) break;
    await stale.getByRole("button", { name: "Elimina" }).click();
    await stale.getByRole("button", { name: "Confermi?" }).click();
    await p.waitForTimeout(600);
  }

  // --- validazione ---
  await p.click('button:has-text("Aggiungi")');
  await p.waitForFunction(
    () => document.querySelectorAll('[role=alert]').length > 0,
    null,
    { timeout: 12000 },
  );
  check("2 aggiunta rifiutata a campi vuoti", true);

  // --- aggiunta ---
  await p.fill("#name", NAME);
  await p.fill("#plate", PLATE.toLowerCase());
  await p.click('button:has-text("Aggiungi")');
  await p.waitForFunction(
    () => [...document.querySelectorAll("[data-sonner-toast]")]
      .some((t) => t.textContent?.includes("aggiunta")),
    null,
    { timeout: 12000 },
  );
  check("3 aggiunta con conferma", true);

  await p.waitForFunction(
    (plate) => document.querySelector("table")?.textContent?.includes(plate),
    PLATE,
    { timeout: 8000 },
  );
  check("4 targa normalizzata maiuscola", true, PLATE);

  // --- nel Select della pratica ---
  await p.goto(`${B}/pratiche/nuova`);
  await p.waitForTimeout(700);
  await p.click("#vehicleId");
  await p.waitForSelector("[role=option]", { timeout: 8000 });
  const options = await p.$$eval("[role=option]", (els) => els.map((e) => e.textContent));
  check("5 compare nel Select della pratica", options.some((o) => o?.includes(PLATE)),
    JSON.stringify(options));
  await p.click(`[role=option]:has-text("${PLATE}")`);
  await p.waitForTimeout(300);

  // --- la targa arriva nel documento ---
  await fillPractice(p, SAMPLE);
  await Promise.all([
    p.waitForURL(/\/pratiche\/\d+$/, { timeout: 20000 }),
    p.click('button:has-text("Crea pratica")'),
  ]);
  const id = p.url().match(/(\d+)$/)[1];

  const docText = async () => {
    const res = await p.request.get(`${B}/api/pratiche/${id}/genera?doc=2`);
    const zip = await JSZip.loadAsync(await res.body());
    const xml = await zip.file("word/document.xml").async("string");
    return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
  };

  check("6 targa nel documento 2", (await docText()).includes(PLATE));

  // --- il controllo che giustifica la colonna copiata ---
  await p.goto(`${B}/impostazioni`);
  await p.waitForSelector("table", { timeout: 10000 });

  // Elimina la riga di questa targa, non la prima della tabella: l'elenco puo'
  // contenere mezzi lasciati da esecuzioni precedenti.
  const row = p.locator("tr", { hasText: PLATE });
  await row.getByRole("button", { name: "Elimina" }).click();
  await row.getByRole("button", { name: "Confermi?" }).click();

  // La targa va cercata nella tabella, non nel body: resta scritta nel campo
  // del form di aggiunta finche' React non lo azzera.
  await p.waitForFunction(
    (plate) => !document.querySelector("table")?.textContent?.includes(plate),
    PLATE,
    { timeout: 10000 },
  );
  check("7 autofunebre eliminata", true);

  check(
    "8 la targa resta nel documento",
    (await docText()).includes(PLATE),
    "se fallisce, la copia sulla pratica non funziona",
  );

  // --- la pratica lo dichiara invece di tacere ---
  await p.goto(`${B}/pratiche/${id}`);
  await p.waitForSelector("#vehicleId", { timeout: 10000 });
  // La descrizione del solo campo autofunebre: cercarla nell'intera pagina
  // prenderebbe la prima di un altro campo.
  const hint = await p
    .locator('[data-slot=field]:has(#vehicleId) [data-slot=field-description]')
    .textContent();
  check(
    "9 avvisa che il mezzo non e' in elenco",
    Boolean(hint?.includes("non piu'") && hint?.includes(PLATE)),
    hint ?? "(nessuna descrizione)",
  );

  // --- pulizia ---
  await p.click('button:has-text("Elimina")');
  await Promise.all([
    p.waitForURL((u) => u.pathname === "/pratiche", { timeout: 15000 }),
    p.click('button:has-text("Confermi")'),
  ]);

  // Ricrea l'autofunebre per pratiche.mjs, che gira dopo e la usa.
  await p.goto(`${B}/impostazioni`);
  await p.waitForTimeout(600);
  await p.fill("#name", NAME);
  await p.fill("#plate", PLATE);
  await p.click('button:has-text("Aggiungi")');
  await p.waitForFunction(
    (plate) => document.querySelector("table")?.textContent?.includes(plate),
    PLATE,
    { timeout: 10000 },
  );

  console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
  if (fail) process.exitCode = 1;
} finally {
  await b.close();
}
