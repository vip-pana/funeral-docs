import { expect, type Page, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deleteResource,
  expectSaved,
  unique,
} from "./helpers";

/**
 * Rest (R), only for bearers on a contract: a whole day or half of one, with
 * the services of the other half. It is worth nothing.
 */

const MONTH = "2026-12";

test.use({ viewport: { width: 1600, height: 960 } });

test("il riposo, intero o a metà, non dà punti", async ({ page }, info) => {
  const name = unique(info, "Mario Riposo");
  await addBearer(page, name, { contract: true });

  const cellIn = (p: Page, day: string) =>
    p.getByRole("button", { name: new RegExp(`^${name}, ${day}:`) });
  const totalIn = (p: Page) =>
    p
      .locator("tr", { has: p.locator("th", { hasText: name.toUpperCase() }) })
      .locator("td")
      .first();
  const cell = (day: string) => cellIn(page, day);
  const total = totalIn(page);
  const menu = page.locator("[data-slot=popover-content]");
  const url = `/calendar?month=${MONTH}&view=mese`;

  await page.goto(url);

  // Wednesday the 9th: a whole day of rest.
  await cell("9 dicembre").click();
  await menu
    .getByRole("button", { name: /^Riposo/ })
    .first()
    .click();
  await expect(cell("9 dicembre")).toHaveText("R");
  await expect(total).toHaveText("");

  // Thursday the 10th: rest in the morning, 2 services in the afternoon.
  await cell("10 dicembre").click();
  await menu.getByRole("button", { name: "Riposo mattina" }).click();
  await menu.getByRole("button", { name: /^2 servizi(?! in prova)/ }).click();
  const half = cell("10 dicembre").locator("[data-half]");
  await expect(half).toHaveAttribute("data-kind", "R");
  await expect(half).toHaveAttribute("data-half", "M");
  await expect(total).toHaveText("2");

  await expectSaved(page, url, async (other) => {
    await expect(cellIn(other, "9 dicembre")).toHaveText("R", {
      timeout: 1000,
    });
    await expect(totalIn(other)).toHaveText("2", { timeout: 1000 });
  });

  await deleteResource(page, bearerCard, name);
});

test("senza contratto il riposo non si offre", async ({ page }, info) => {
  const name = unique(info, "Mario Senzariposo");
  await addBearer(page, name);

  await page.goto(`/calendar?month=${MONTH}&view=mese`);
  await page
    .getByRole("button", { name: new RegExp(`^${name}, 9 dicembre:`) })
    .click();
  const menu = page.locator("[data-slot=popover-content]");
  await expect(
    menu.getByRole("button", { name: "Ferie mattina" }),
  ).toBeVisible();
  await expect(menu.getByRole("button", { name: /Riposo/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await deleteResource(page, bearerCard, name);
});
