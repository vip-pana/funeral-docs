import { chromium } from "playwright-core";
import JSZip from "jszip";

import { fillPractice, login, pickSelect, SAMPLE } from "./helpers.mjs";

/**
 * Driver list and the name copied onto the practice.
 *
 * Check 8 is the central one: once the driver is deleted, the name must stay in
 * documents already issued. That is the reason the practice keeps a copy of the
 * name rather than just the reference.
 *
 * Runs before pratiche.mjs, which reuses the driver left here.
 */

const B = process.env.BASE_URL ?? "http://localhost:3000";
const DRIVER = "Giuseppe Verdi";

const b = await chromium.launch({ channel: "chrome" });
try {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 960 } })).newPage();
  p.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0, 160)));

  let fail = 0;
  const check = (n, c, x = "") => {
    console.log(c ? "ok  " : "FAIL", n, x);
    if (!c) fail++;
  };

  await login(p, B);
  await p.goto(`${B}/settings`);
  await p.waitForTimeout(700);

  // The Autofunebri card has an identical "Aggiungi" button and its own table:
  // everything here is scoped to the driver card.
  const card = p.locator('[data-slot=card]:has(#driverName)');
  const addDriver = () => card.getByRole("button", { name: "Aggiungi" }).click();

  check("1 card Conducenti presente", Boolean(await card.count()));

  // Remove drivers left by previous runs: the suite recreates one at the end,
  // and without this cleanup they would pile up.
  for (let i = 0; i < 10; i++) {
    const stale = card.locator("tr", { hasText: DRIVER }).first();
    if (!(await stale.count())) break;
    await stale.getByRole("button", { name: "Elimina" }).click();
    await stale.getByRole("button", { name: "Confermi?" }).click();
    await p.waitForTimeout(600);
  }

  // --- validation ---
  await addDriver();
  await p.waitForFunction(
    () => document.querySelectorAll("[role=alert]").length > 0,
    null,
    { timeout: 12000 },
  );
  check("2 aggiunta rifiutata a campo vuoto", true);

  // --- adding ---
  await p.fill("#driverName", DRIVER);
  await addDriver();
  await p.waitForFunction(
    () => [...document.querySelectorAll("[data-sonner-toast]")]
      .some((t) => t.textContent?.includes("Conducente aggiunto")),
    null,
    { timeout: 12000 },
  );
  check("3 aggiunta con conferma", true);

  await card.locator("table", { hasText: DRIVER }).waitFor({ timeout: 8000 });
  check("4 compare in elenco", true, DRIVER);

  // --- in the practice Select ---
  await p.goto(`${B}/deceased/new`);
  await p.waitForTimeout(700);
  const picked = await pickSelect(p, "driverId", DRIVER);
  check("5 compare nel Select del defunto", picked);

  // --- the name reaches the document ---
  await fillPractice(p, SAMPLE);
  await Promise.all([
    p.waitForURL(/\/deceased\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, { timeout: 20000 }),
    p.click('button:has-text("Crea scheda")'),
  ]);
  const id = p.url().match(/\/deceased\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)[1];

  // The driver only appears in document 4.
  const docText = async () => {
    const res = await p.request.get(`${B}/api/deceased/${id}/generate?doc=4`);
    const zip = await JSZip.loadAsync(await res.body());
    const xml = await zip.file("word/document.xml").async("string");
    return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
  };

  check("6 conducente nel documento 4", (await docText()).includes(DRIVER));

  // --- the check that justifies the copied column ---
  await p.goto(`${B}/settings`);
  await card.locator("table").waitFor({ timeout: 10000 });

  // Delete the row for this driver, not the first in the table: the list can
  // hold drivers left by previous runs.
  const row = card.locator("tr", { hasText: DRIVER });
  await row.getByRole("button", { name: "Elimina" }).click();
  await row.getByRole("button", { name: "Confermi?" }).click();
  await row.waitFor({ state: "detached", timeout: 10000 });
  check("7 conducente eliminato", true);

  check(
    "8 il nome resta nel documento",
    (await docText()).includes(DRIVER),
    "se fallisce, la copia sulla scheda non funziona",
  );

  // --- the practice says so instead of staying silent ---
  await p.goto(`${B}/deceased/${id}`);
  await p.waitForSelector("#driverId", { timeout: 10000 });
  // The description of the driver field alone: searching the whole page would
  // pick up the first one belonging to another field.
  const hint = await p
    .locator('[data-slot=field]:has(#driverId) [data-slot=field-description]')
    .textContent();
  check(
    "9 avvisa che il conducente non e' in elenco",
    Boolean(hint?.includes("non piu'") && hint?.includes(DRIVER)),
    hint ?? "(nessuna descrizione)",
  );

  // --- cleanup ---
  await p.click('button:has-text("Elimina")');
  await Promise.all([
    p.waitForURL((u) => u.pathname === "/deceased", { timeout: 15000 }),
    p.click('button:has-text("Confermi")'),
  ]);

  // Recreate the driver for pratiche.mjs, which runs later and uses it.
  await p.goto(`${B}/settings`);
  await p.waitForTimeout(600);
  await p.fill("#driverName", DRIVER);
  await addDriver();
  await card.locator("table", { hasText: DRIVER }).waitFor({ timeout: 10000 });

  console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
  if (fail) process.exitCode = 1;
} finally {
  await b.close();
}
