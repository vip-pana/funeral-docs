import { expect, type Page, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deleteResource,
  expectSaved,
  unique,
} from "./helpers";

/**
 * Travel (V), for everyone and worth nothing: the whole day and nothing else,
 * or half of it beside the services and half a day off in the other half.
 */

const MONTH = "2026-12";

test.use({ viewport: { width: 1600, height: 960 } });

test("il viaggio non dà punti e a mezza giornata lascia il resto", async ({
  page,
}, info) => {
  const name = unique(info, "Vito Viaggio");
  await addBearer(page, name);

  const cellIn = (p: Page, day: string) =>
    p.getByRole("button", { name: new RegExp(`^${name}, ${day}:`) });
  const totalIn = (p: Page) =>
    p
      .locator("tr", { has: p.locator("th", { hasText: name.toUpperCase() }) })
      .locator("[data-total]");
  const cell = (day: string) => cellIn(page, day);
  const small = (day: string, kind: string) =>
    cell(day).locator(`[data-kind=${kind}]`);
  const total = totalIn(page);
  const menu = page.locator("[data-slot=popover-content]");
  const url = `/calendar?month=${MONTH}&view=mese`;

  await page.goto(url);

  // Wednesday the 9th: travel in the morning, 2 services, ferie in the
  // afternoon.
  await cell("9 dicembre").click();
  await menu.getByRole("button", { name: "Viaggio mattina" }).click();
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Ferie pomeriggio" }).click();
  await menu.getByRole("button", { name: /^2 servizi(?! in prova)/ }).click();
  await expect(small("9 dicembre", "V")).toHaveAttribute("data-half", "M");
  await expect(small("9 dicembre", "F")).toHaveAttribute("data-half", "P");
  await expect(cell("9 dicembre")).toContainText("X");
  // The services and the half day of ferie: the travel adds nothing.
  await expect(total).toHaveText("3");

  // Ferie in the morning too: the travel gives way.
  await cell("9 dicembre").click();
  await menu.getByRole("button", { name: "Ferie mattina" }).click();
  await page.keyboard.press("Escape");
  await expect(small("9 dicembre", "V")).toHaveCount(0);
  await expect(small("9 dicembre", "F")).toHaveAttribute("data-half", "M");

  // Thursday the 10th: the whole day.
  await cell("10 dicembre").click();
  await menu.getByRole("button", { name: "Viaggio V" }).click();
  await expect(cell("10 dicembre")).toHaveText("V");
  await expect(total).toHaveText("3");

  await expectSaved(page, url, async (other) => {
    await expect(cellIn(other, "10 dicembre")).toHaveText("V", {
      timeout: 1000,
    });
    await expect(totalIn(other)).toHaveText("3", { timeout: 1000 });
  });

  await deleteResource(page, bearerCard, name);
});
