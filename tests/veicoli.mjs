import { chromium } from "playwright-core";
import JSZip from "jszip";

import { fillPractice, login, SAMPLE } from "./helpers.mjs";

/**
 * Hearse list and the plate copied onto the practice.
 *
 * Check 7 is the central one: once the hearse is deleted, the plate must stay
 * in documents already issued. That is the reason the practice keeps a copy of
 * the plate rather than just the reference.
 *
 * Runs before pratiche.mjs, which reuses the vehicle left here.
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

  // The Conducenti card has an identical "Aggiungi" button and its own table:
  // everything here is scoped to the hearse card, otherwise the selectors would
  // be ambiguous.
  const card = p.locator('[data-slot=card]:has(#plate)');
  const addVehicle = () => card.getByRole("button", { name: "Aggiungi" }).click();

  await login(p, B);
  await p.goto(`${B}/settings`);
  await p.waitForTimeout(700);

  check("1 card Autofunebri presente", (await plateText()).includes("Autofunebri"));

  // Remove hearses left by previous runs: the suite recreates one at the end,
  // and without this cleanup they would pile up.
  for (let i = 0; i < 10; i++) {
    const stale = card.locator("tr", { hasText: PLATE }).first();
    if (!(await stale.count())) break;
    await stale.getByRole("button", { name: "Elimina" }).click();
    await stale.getByRole("button", { name: "Confermi?" }).click();
    await p.waitForTimeout(600);
  }

  // --- validation ---
  await addVehicle();
  await p.waitForFunction(
    () => document.querySelectorAll('[role=alert]').length > 0,
    null,
    { timeout: 12000 },
  );
  check("2 aggiunta rifiutata a campi vuoti", true);

  // --- adding ---
  await p.fill("#name", NAME);
  await p.fill("#plate", PLATE.toLowerCase());
  await addVehicle();
  await p.waitForFunction(
    () => [...document.querySelectorAll("[data-sonner-toast]")]
      .some((t) => t.textContent?.includes("Autofunebre aggiunta")),
    null,
    { timeout: 12000 },
  );
  check("3 aggiunta con conferma", true);

  await card.locator("table", { hasText: PLATE }).waitFor({ timeout: 8000 });
  check("4 targa normalizzata maiuscola", true, PLATE);

  // --- in the practice Select ---
  await p.goto(`${B}/practices/new`);
  await p.waitForTimeout(700);
  await p.click("#vehicleId");
  await p.waitForSelector("[role=option]", { timeout: 8000 });
  const options = await p.$$eval("[role=option]", (els) => els.map((e) => e.textContent));
  check("5 compare nel Select della pratica", options.some((o) => o?.includes(PLATE)),
    JSON.stringify(options));
  await p.click(`[role=option]:has-text("${PLATE}")`);
  await p.waitForTimeout(300);

  // --- the plate reaches the document ---
  await fillPractice(p, SAMPLE);
  await Promise.all([
    p.waitForURL(/\/practices\/\d+$/, { timeout: 20000 }),
    p.click('button:has-text("Crea pratica")'),
  ]);
  const id = p.url().match(/(\d+)$/)[1];

  const docText = async () => {
    const res = await p.request.get(`${B}/api/practices/${id}/generate?doc=2`);
    const zip = await JSZip.loadAsync(await res.body());
    const xml = await zip.file("word/document.xml").async("string");
    return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
  };

  check("6 targa nel documento 2", (await docText()).includes(PLATE));

  // --- the check that justifies the copied column ---
  await p.goto(`${B}/settings`);
  await card.locator("table").waitFor({ timeout: 10000 });

  // Delete the row for this plate, not the first in the table: the list can
  // hold vehicles left by previous runs.
  const row = card.locator("tr", { hasText: PLATE });
  await row.getByRole("button", { name: "Elimina" }).click();
  await row.getByRole("button", { name: "Confermi?" }).click();

  // Look for the plate in the table, not the body: it stays written in the add
  // form's field until React clears it.
  await row.waitFor({ state: "detached", timeout: 10000 });
  check("7 autofunebre eliminata", true);

  check(
    "8 la targa resta nel documento",
    (await docText()).includes(PLATE),
    "se fallisce, la copia sulla pratica non funziona",
  );

  // --- the practice says so instead of staying silent ---
  await p.goto(`${B}/practices/${id}`);
  await p.waitForSelector("#vehicleId", { timeout: 10000 });
  // The description of the hearse field alone: searching the whole page would
  // pick up the first one belonging to another field.
  const hint = await p
    .locator('[data-slot=field]:has(#vehicleId) [data-slot=field-description]')
    .textContent();
  check(
    "9 avvisa che il mezzo non e' in elenco",
    Boolean(hint?.includes("non piu'") && hint?.includes(PLATE)),
    hint ?? "(nessuna descrizione)",
  );

  // --- cleanup ---
  await p.click('button:has-text("Elimina")');
  await Promise.all([
    p.waitForURL((u) => u.pathname === "/practices", { timeout: 15000 }),
    p.click('button:has-text("Confermi")'),
  ]);

  // Recreate the hearse for pratiche.mjs, which runs later and uses it.
  await p.goto(`${B}/settings`);
  await p.waitForTimeout(600);
  await p.fill("#name", NAME);
  await p.fill("#plate", PLATE);
  await addVehicle();
  await card.locator("table", { hasText: PLATE }).waitFor({ timeout: 10000 });

  console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
  if (fail) process.exitCode = 1;
} finally {
  await b.close();
}
