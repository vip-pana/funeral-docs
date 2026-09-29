import { chromium } from "playwright-core";

import { login } from "./helpers.mjs";

/**
 * The Contratto flag on the bearer list and what it does to the calendar: a
 * bearer on a contract gets a single ferie entry, written as a bare F that
 * adds nothing to the total. Unticking the box scores the same day again,
 * because the points are worked out when shown.
 */

const B = process.env.BASE_URL ?? "http://localhost:3000";
const NAME = "Mario Contratto";
// Wednesday 9 December 2026, a working day: F1 once the contract is gone.
const MONTH = "2026-12";
const DAY = "9 dicembre";

const b = await chromium.launch({ channel: "chrome" });
try {
  const p = await (
    await b.newContext({ viewport: { width: 1600, height: 960 } })
  ).newPage();
  p.on("pageerror", (e) =>
    console.log("  [pageerror]", e.message.slice(0, 160)),
  );

  let fail = 0;
  const check = (n: string, c: unknown, x: unknown = "") => {
    console.log(c ? "ok  " : "FAIL", n, x);
    if (!c) fail++;
  };

  await login(p, B);
  await p.goto(`${B}/resources`);
  await p.waitForTimeout(700);

  const card = p.locator("[data-slot=card]:has(#bearerName)");
  const row = () => card.locator("tr", { hasText: NAME });
  const contractBox = () => row().locator("[id^=bearerHasContract-]");

  // Rows left by an earlier run: deleting them takes their days too.
  for (let i = 0; i < 10; i++) {
    const stale = row().first();
    if (!(await stale.count())) break;
    await stale.getByRole("button", { name: "Elimina" }).click();
    await stale.getByRole("button", { name: "Confermi?" }).click();
    await p.waitForTimeout(600);
  }

  // --- adding, with the contract ticked in the same form ---
  await p.fill("#bearerName", NAME);
  await p.click("#bearerHasContract");
  await card.getByRole("button", { name: "Aggiungi" }).click();
  await row().waitFor({ timeout: 12000 });
  check("1 aggiunto in elenco", true, NAME);
  check(
    "2 contratto spuntato",
    (await contractBox().getAttribute("data-state")) === "checked",
  );

  // --- the calendar ---
  const cell = () =>
    p.getByRole("button", { name: new RegExp(`^${NAME}, ${DAY}:`) });
  const total = () =>
    p
      .locator("tr", { has: p.locator("th", { hasText: NAME.toUpperCase() }) })
      .locator("td")
      .first();

  await p.goto(`${B}/calendar?month=${MONTH}`);
  await cell().click();
  const menu = p.locator("[data-slot=popover-content]");
  await menu.waitFor({ timeout: 5000 });
  const entries = await menu.locator("button").allTextContents();
  check(
    "3 una sola voce di ferie",
    entries.filter((t) => t.startsWith("Ferie")).length === 1,
    entries.join(" | "),
  );
  await menu.getByRole("button", { name: /^Ferie/ }).click();
  await p.waitForTimeout(800);
  await p.reload();
  check(
    "4 cella con F senza punti",
    (await cell().textContent())?.trim() === "F",
    await cell().textContent(),
  );
  check(
    "5 totale vuoto",
    (await total().textContent())?.trim() === "",
    await total().textContent(),
  );

  // --- unticking the box scores the same day ---
  await p.goto(`${B}/resources`);
  await contractBox().click();
  await p.waitForTimeout(800);
  await p.goto(`${B}/calendar?month=${MONTH}`);
  check(
    "6 senza contratto diventa F1",
    (await cell().textContent())?.startsWith("F1"),
    await cell().textContent(),
  );
  check(
    "7 totale 1",
    (await total().textContent())?.trim() === "1",
    await total().textContent(),
  );

  // --- cleanup ---
  await p.goto(`${B}/resources`);
  await row().getByRole("button", { name: "Elimina" }).click();
  await row().getByRole("button", { name: "Confermi?" }).click();
  await p.waitForTimeout(600);
  check("8 eliminato", !(await row().count()));

  console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
  process.exitCode = fail ? 1 : 0;
} finally {
  await b.close();
}
