import { expect, type Page, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deleteResource,
  expectSaved,
  unique,
} from "./helpers";

/**
 * Sick leave (M), for everyone: always the whole day, worth nothing, and it
 * takes the place of whatever the day held.
 */

const MONTH = "2026-12";

test.use({ viewport: { width: 1600, height: 960 } });

test("la malattia prende tutta la giornata e non dà punti", async ({
  page,
}, info) => {
  const name = unique(info, "Mario Malattia");
  await addBearer(page, name);

  const cellIn = (p: Page, day: string) =>
    p.getByRole("button", { name: new RegExp(`^${name}, ${day}:`) });
  const totalIn = (p: Page) =>
    p
      .locator("tr", { has: p.locator("th", { hasText: name.toUpperCase() }) })
      .locator("td")
      .first();
  const cell = (day: string) => cellIn(page, day);
  const menu = page.locator("[data-slot=popover-content]");
  const url = `/calendar?month=${MONTH}&view=mese`;

  await page.goto(url);

  // Wednesday the 9th: 2 services, then sick leave replaces them.
  await cell("9 dicembre").click();
  await menu.getByRole("button", { name: /^2 servizi(?! in prova)/ }).click();
  await expect(totalIn(page)).toHaveText("2");
  await cell("9 dicembre").click();
  await menu.getByRole("button", { name: /^Malattia/ }).click();
  await expect(cell("9 dicembre")).toHaveText("M");
  await expect(totalIn(page)).toHaveText("");

  await expectSaved(page, url, async (other) => {
    await expect(cellIn(other, "9 dicembre")).toHaveText("M", {
      timeout: 1000,
    });
    await expect(totalIn(other)).toHaveText("", { timeout: 1000 });
  });

  await deleteResource(page, bearerCard, name);
});
