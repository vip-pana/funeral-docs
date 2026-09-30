import { expect, type Page, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deleteResource,
  expectSaved,
  unique,
} from "./helpers";

/**
 * Half a day of ferie, morning or afternoon: a small F high or low beside the
 * services of the other half. It is worth 1, and 4 on a red day.
 */

const MONTH = "2026-12";

test.use({ viewport: { width: 1600, height: 960 } });

test("mezza giornata di ferie con i servizi dell'altra metà", async ({
  page,
}, info) => {
  const name = unique(info, "Mario Mezzagiornata");
  await addBearer(page, name);

  const cellIn = (p: Page, day: string) =>
    p.getByRole("button", { name: new RegExp(`^${name}, ${day}:`) });
  const totalIn = (p: Page) =>
    p
      .locator("tr", { has: p.locator("th", { hasText: name.toUpperCase() }) })
      .locator("td")
      .first();
  const cell = (day: string) => cellIn(page, day);
  const half = (day: string) => cell(day).locator("[data-half]");
  const total = totalIn(page);
  const url = `/calendar?month=${MONTH}&view=mese`;
  const menu = page.locator("[data-slot=popover-content]");

  await page.goto(url);

  // Wednesday the 9th: the morning off, then 3 services, from one menu.
  await cell("9 dicembre").click();
  await menu.getByRole("button", { name: "Ferie mattina" }).click();
  // Still open, to add the services of the afternoon.
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: /^3 servizi(?! in prova)/ }).click();
  await expect(menu).toBeHidden();
  await expect(half("9 dicembre")).toHaveAttribute("data-half", "M");
  await expect(cell("9 dicembre")).toContainText("\\\\\\");
  await expect(total).toHaveText("4");

  // The afternoon instead: the F moves, the services stay.
  await cell("9 dicembre").click();
  await menu.getByRole("button", { name: "Ferie pomeriggio" }).click();
  await expect(half("9 dicembre")).toHaveAttribute("data-half", "P");
  // Tapped again, the half goes and the 3 services are left.
  await menu.getByRole("button", { name: "Ferie pomeriggio" }).click();
  await page.keyboard.press("Escape");
  await expect(half("9 dicembre")).toHaveCount(0);
  await expect(total).toHaveText("3");

  // Tuesday the 8th is a holiday: half a day alone is worth 4.
  await cell("8 dicembre").click();
  await menu.getByRole("button", { name: "Ferie pomeriggio" }).click();
  await page.keyboard.press("Escape");
  await expect(half("8 dicembre")).toHaveAttribute("data-half", "P");
  await expect(total).toHaveText("7");

  // Saved, not just shown.
  await expectSaved(page, url, async (other) => {
    await expect(
      cellIn(other, "8 dicembre").locator("[data-half]"),
    ).toHaveAttribute("data-half", "P", { timeout: 1000 });
    await expect(totalIn(other)).toHaveText("7", { timeout: 1000 });
  });

  // Deleting the bearer takes their days too.
  await deleteResource(page, bearerCard, name);
});
