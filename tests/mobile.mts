import { chromium } from "playwright-core";

import { login } from "./helpers.mjs";

/**
 * A phone-sized screen. Check 1 is the general one: no page may scroll
 * sideways. The rest drive the calendar the way a phone gets it — one
 * bearer's month by default, a day marked from the sheet at the bottom — and
 * switch to the day view.
 *
 * Works on a month far ahead, which nothing else fills, and empties the day
 * it marks.
 */

const B = process.env.BASE_URL ?? "http://localhost:3000";
const MONTH = "2030-01";

const b = await chromium.launch({ channel: "chrome" });
try {
  const p = await (
    await b.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
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

  // --- nothing wider than the screen ---
  for (const path of [
    "/deceased",
    "/deceased/new",
    "/clients",
    "/clients/new",
    "/resources",
    "/calendar",
    "/settings",
  ]) {
    await p.goto(`${B}${path}`);
    await p.waitForTimeout(500);
    const width = await p.evaluate(() => document.documentElement.scrollWidth);
    check(`1 ${path} senza scorrimento laterale`, width <= 390, `${width}px`);
  }

  // --- the calendar opens on one bearer ---
  await p.goto(`${B}/calendar?month=${MONTH}`);
  const total = p.getByTestId("person-total");
  await total.waitFor({ timeout: 8000 });
  check("2 vista necroforo di default", await total.isVisible());
  check("  griglia nascosta", !(await p.locator("table.calendar").isVisible()));
  const before = Number(await total.textContent());

  // Thursday 3 January 2030, a working day.
  const cell = p.getByRole("button", { name: /, 3 gennaio:/ });
  await cell.click();
  const sheet = p.getByRole("dialog");
  await sheet.waitFor({ timeout: 5000 });
  check("3 pannello dal basso", true);
  await sheet.getByRole("button", { name: /^1 servizio/ }).click();
  await sheet.waitFor({ state: "hidden", timeout: 5000 });
  await p.waitForTimeout(800);
  check(
    "4 servizio segnato",
    (await cell.textContent())?.includes("\\"),
    await cell.textContent(),
  );
  check(
    "  totale aumentato",
    Number(await total.textContent()) === before + 1,
    await total.textContent(),
  );

  await p.reload();
  await total.waitFor({ timeout: 8000 });
  check(
    "5 salvato",
    Number(await total.textContent()) === before + 1,
    await total.textContent(),
  );

  // --- the day view ---
  await p.getByRole("button", { name: "Giorno" }).click();
  check(
    "6 vista giorno nell'indirizzo",
    p.url().includes("view=giorno"),
    p.url(),
  );
  await p
    .getByRole("button", { name: /3 gennaio/ })
    .first()
    .click();
  const marked = p.getByRole("button", { name: /: 1 servizio$/ });
  check("7 il servizio compare nel giorno", (await marked.count()) >= 1);

  // --- cleanup ---
  await marked.first().click();
  await p.getByRole("dialog").getByRole("button", { name: "Svuota" }).click();
  await p.waitForTimeout(800);
  check(
    "8 giorno svuotato",
    (await p.getByRole("button", { name: /: 1 servizio$/ }).count()) === 0,
  );

  console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
  process.exitCode = fail ? 1 : 0;
} finally {
  await b.close();
}
