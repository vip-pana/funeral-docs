import { chromium } from "playwright-core";
import JSZip from "jszip";

import { fillPractice, login, pickSelect, SAMPLE } from "./helpers.mjs";

/**
 * Attachments 2 and 3 of L.R. 34/2008 (documents 6 and 7) and the bearer list.
 *
 * Check 6 is the central one: the bearer names must stay in a document already
 * issued after the bearer is removed from the list, which is why the record
 * copies the names instead of just the ids.
 */

const B = process.env.BASE_URL ?? "http://localhost:3000";
const BEARER = "Paolo Neri";
const ROLE = "INCARICATO";

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

  const card = p.locator('[data-slot=card]:has(#bearerName)');
  const addBearer = () => card.getByRole("button", { name: "Aggiungi" }).click();

  check("1 card Necrofori presente", Boolean(await card.count()));

  // Remove bearers left by previous runs, then add the one this suite uses.
  for (let i = 0; i < 10; i++) {
    const stale = card.locator("tr", { hasText: BEARER }).first();
    if (!(await stale.count())) break;
    await stale.getByRole("button", { name: "Elimina" }).click();
    await stale.getByRole("button", { name: "Confermi?" }).click();
    await p.waitForTimeout(600);
  }

  await p.fill("#bearerName", BEARER);
  await addBearer();
  await card.locator("table", { hasText: BEARER }).waitFor({ timeout: 10000 });
  check("2 necroforo aggiunto", true, BEARER);

  // --- the record picks it, plus the applicant role ---
  await p.goto(`${B}/deceased/new`);
  await p.waitForTimeout(700);
  await fillPractice(p, SAMPLE);
  await pickSelect(p, "vehicleId", "FG123AB");
  await pickSelect(p, "driverId", "Giuseppe Verdi");
  await p.fill("#applicantRole", ROLE);

  // The bearer is a checkbox, not a Select: several are chosen at once.
  const box = p.locator(`label:has-text("${BEARER}") [role=checkbox]`).first();
  check("3 casella del necroforo presente", Boolean(await box.count()));
  await box.click();
  await p.waitForTimeout(250);

  await Promise.all([
    p.waitForURL(/\/deceased\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, { timeout: 20000 }),
    p.click('button:has-text("Crea scheda")'),
  ]);
  const id = p.url().match(/\/deceased\/([0-9a-f-]{36})$/)[1];

  const docText = async (doc) => {
    const res = await p.request.get(`${B}/api/deceased/${id}/generate?doc=${doc}`);
    const zip = await JSZip.loadAsync(await res.body());
    const xml = await zip.file("word/document.xml").async("string");
    return [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
  };

  // --- both attachments come out filled in ---
  for (const doc of ["6", "7"]) {
    const txt = await docText(doc);
    check(`4 documento ${doc} generato`, txt.includes("Rossi") && txt.includes("Mario"));
    // The raw placeholder surviving means a field is declared but never filled.
    check(`  ${doc} nessun placeholder`, !txt.match(/\{[^}]*\}/), txt.match(/\{[^}]*\}/g)?.join(" ") ?? "");
  }

  const doc7 = await docText("7");
  check("5 necroforo nel documento 7", doc7.includes(BEARER));
  check("  qualita del richiedente", doc7.includes(ROLE));
  // Derived from the birth municipality, never typed in.
  check("  provincia di nascita ricavata", doc7.includes("(FG)"));

  // --- the check that justifies copying the names ---
  await p.goto(`${B}/settings`);
  await card.locator("table").waitFor({ timeout: 10000 });
  const row = card.locator("tr", { hasText: BEARER });
  await row.getByRole("button", { name: "Elimina" }).click();
  await row.getByRole("button", { name: "Confermi?" }).click();
  await row.waitFor({ state: "detached", timeout: 10000 });

  check(
    "6 il nome resta nel documento",
    (await docText("7")).includes(BEARER),
    "se fallisce, la copia sulla scheda non funziona",
  );

  // --- cleanup ---
  await p.goto(`${B}/deceased/${id}`);
  await p.click('button:has-text("Elimina")');
  await Promise.all([
    p.waitForURL((u) => u.pathname === "/deceased", { timeout: 15000 }),
    p.click('button:has-text("Confermi")'),
  ]);

  // Recreate the bearer: pratiche.mjs runs later and downloads every document.
  await p.goto(`${B}/settings`);
  await p.waitForTimeout(600);
  await p.fill("#bearerName", BEARER);
  await addBearer();
  await card.locator("table", { hasText: BEARER }).waitFor({ timeout: 10000 });

  console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
  if (fail) process.exitCode = 1;
} finally {
  await b.close();
}
