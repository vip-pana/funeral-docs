import { expect, type Page, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deleteResource,
  expectSaved,
  unique,
} from "./helpers";

/**
 * Services done in the trial period: written P, PP, PPP and worth the same
 * as the others. Not offered to a bearer on a contract.
 */

const MONTH = "2026-12";

test.use({ viewport: { width: 1600, height: 960 } });

test("i servizi in prova valgono come gli altri", async ({ page }, info) => {
  const name = unique(info, "Mario Prova");
  await addBearer(page, name);

  const cellIn = (p: Page, day: string) =>
    p.getByRole("button", { name: new RegExp(`^${name}, ${day}:`) });
  const totalIn = (p: Page) =>
    p
      .locator("tr", { has: p.locator("th", { hasText: name.toUpperCase() }) })
      .locator("[data-total]");
  const cell = (day: string) => cellIn(page, day);
  const total = totalIn(page);
  const menu = page.locator("[data-slot=popover-content]");
  const url = `/calendar?month=${MONTH}&view=mese`;

  await page.goto(url);

  // Wednesday the 9th: 2 services in the trial period.
  await cell("9 dicembre").click();
  await menu.getByRole("button", { name: "2 servizi in prova" }).click();
  await expect(cell("9 dicembre")).toHaveText(/^PP/);
  await expect(total).toHaveText("2");

  // Thursday the 10th: the morning off and 3 services in the trial period.
  await cell("10 dicembre").click();
  await menu.getByRole("button", { name: "Ferie mattina" }).click();
  await menu.getByRole("button", { name: "3 servizi in prova" }).click();
  await expect(cell("10 dicembre")).toContainText("PPP");
  await expect(total).toHaveText("6");

  await expectSaved(page, url, async (other) => {
    await expect(cellIn(other, "9 dicembre")).toHaveText(/^PP/, {
      timeout: 1000,
    });
    await expect(totalIn(other)).toHaveText("6", { timeout: 1000 });
  });

  await deleteResource(page, bearerCard, name);
});

test("con il contratto la prova non si offre", async ({ page }, info) => {
  const name = unique(info, "Mario Provacontratto");
  await addBearer(page, name, { contract: true });

  await page.goto(`/calendar?month=${MONTH}&view=mese`);
  await page
    .getByRole("button", { name: new RegExp(`^${name}, 9 dicembre:`) })
    .click();
  const menu = page.locator("[data-slot=popover-content]");
  await expect(
    menu.getByRole("button", { name: /^2 servizi(?! in prova)/ }),
  ).toBeVisible();
  await expect(menu.getByRole("button", { name: /in prova/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await deleteResource(page, bearerCard, name);
});
