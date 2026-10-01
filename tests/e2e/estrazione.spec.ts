import { expect, test } from "@playwright/test";

import { addBearer, bearerCard, deleteResource, unique } from "./helpers";

/**
 * Picking the bearers for a funeral. The proposal depends on every bearer in
 * the database, so this checks the rest: who is left out, the choice by hand,
 * and the service it writes on the calendar. The proposal itself is covered
 * by the unit tests of src/lib/extraction.ts.
 */

// Wednesday 10 March 2027: far enough off to hold no real marks.
const DATE = "2027-03-10";
const DAY = "10 marzo";

test.use({ viewport: { width: 1600, height: 1200 } });

test("si scelgono i necrofori a mano e il servizio va sul calendario", async ({
  page,
}, info) => {
  const away = unique(info, "Mario Inferie");
  const first = unique(info, "Mario Scelto");
  const second = unique(info, "Mario Anchelui");
  for (const name of [away, first, second]) await addBearer(page, name);

  const cell = (name: string) =>
    page.getByRole("button", { name: new RegExp(`^${name}, ${DAY}:`) });

  // A day of ferie for one of them.
  await page.goto(`/calendar?month=${DATE.slice(0, 7)}&view=mese`);
  await cell(away).click();
  const menu = page.locator("[data-slot=popover-content]");
  await menu.getByRole("button", { name: /^Ferie, avviso 48/ }).click();
  await expect(cell(away)).toHaveText(/^F1/);

  await page.goto(`/calendar/estrazione?date=${DATE}`);
  const summary = page.getByTestId("extraction-summary");
  const cards = page.getByTestId("extraction-picked");
  const dialog = page.getByRole("dialog");
  const row = (name: string) => dialog.locator("tr", { hasText: name });
  const edit = page.getByRole("button", { name: "Modifica" });

  // The list lives in the dialog: unavailable bearers have no box to tick.
  await edit.click();
  await expect(row(away)).toContainText("Non disponibile: Ferie");
  await expect(row(away).getByRole("checkbox")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Annulla" }).click();
  await expect(dialog).toBeHidden();

  // Ricalcola moves on to another proposal, as many times as wanted: every
  // real bearer has 0 in that month, so there are plenty.
  await expect(summary).toContainText("Proposta 1 di");
  const recalc = page.getByRole("button", { name: "Ricalcola proposta" });
  await recalc.click();
  await expect(summary).toContainText("Proposta 2 di");
  await recalc.click();
  await expect(summary).toContainText("Proposta 3 di");

  // Only the two of them: the proposal's ticks come off first. Nothing
  // changes on the page until Conferma.
  const ticked = dialog.getByRole("checkbox", { checked: true });
  async function choose(...names: string[]) {
    await edit.click();
    while ((await ticked.count()) > 0) await ticked.first().click();
    for (const name of names) {
      await dialog.getByRole("checkbox", { name: `Scegli ${name}` }).click();
    }
    await dialog.getByRole("button", { name: "Conferma" }).click();
    await expect(dialog).toBeHidden();
  }
  await choose(first, second);
  await expect(summary).toContainText("2 scelti");
  await expect(cards).toContainText(first, { ignoreCase: true });
  await expect(cards).toContainText(second, { ignoreCase: true });

  const confirm = page.getByRole("button", {
    name: `Segna il servizio il ${DAY}`,
  });
  await confirm.click();
  await expect(
    page.locator("[data-sonner-toast]", { hasText: "Servizio segnato" }),
  ).toBeVisible();
  // The totals moved, and the list says what the day now holds.
  await edit.click();
  await expect(row(first)).toContainText("1 servizio già segnato");
  await dialog.getByRole("button", { name: "Annulla" }).click();

  // Once more by hand: the second service of the day.
  await choose(first);
  await expect(cards).toContainText("1 servizio già segnato");
  await confirm.click();
  await edit.click();
  await expect(row(first)).toContainText("2 servizi già segnati");
  await dialog.getByRole("button", { name: "Annulla" }).click();

  await page.goto(`/calendar?month=${DATE.slice(0, 7)}&view=mese`);
  await expect(cell(first)).toHaveText(/^X/);
  await expect(cell(second)).toHaveText(/^\\/);
  await expect(cell(away)).toHaveText(/^F1/);

  for (const name of [away, first, second]) {
    await deleteResource(page, bearerCard, name);
  }
});

test("torna al calendario nella vista da cui si era partiti", async ({
  page,
}) => {
  await page.goto(`/calendar?month=${DATE.slice(0, 7)}&view=mese`);
  await page.getByRole("link", { name: "Estrai necrofori" }).click();
  await expect(page).toHaveURL(/\/calendar\/estrazione\?/);

  // Changing the date keeps the way back.
  await page.fill("#extractionDate", "2027-03-11");
  await expect(page).toHaveURL(/date=2027-03-11/);

  await page.getByRole("link", { name: "Torna al calendario" }).click();
  await expect(page).toHaveURL(/\/calendar\?.*view=mese/);
  await expect(page.getByRole("button", { name: "Mese" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
