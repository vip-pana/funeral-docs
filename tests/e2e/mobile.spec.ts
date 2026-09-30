import { expect, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deleteResource,
  SESSION,
  unique,
} from "./helpers";

/**
 * A phone-sized screen: no page may scroll sideways, and the calendar comes
 * the way a phone gets it — one bearer's month, a day marked from the sheet at
 * the bottom, and the day view.
 */

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

for (const path of [
  "/deceased",
  "/deceased/new",
  "/clients",
  "/clients/new",
  "/resources",
  "/calendar",
  "/settings",
]) {
  test(`${path} non scorre di lato`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });
}

// A month far ahead, which nothing else fills.
const MONTH = "2030-01";

test("il calendario si segna dal telefono", async ({ page, browser }, info) => {
  // Its own bearer, added from a desktop page: on a phone the bearers' table
  // is hidden.
  const name = unique(info, "Mobile Prova");
  // The file's phone options apply to new pages too, so they are undone here.
  const desktop = await browser.newPage({
    storageState: SESSION,
    viewport: { width: 1280, height: 900 },
    isMobile: false,
    hasTouch: false,
  });
  await addBearer(desktop, name);

  await page.goto(`/calendar?month=${MONTH}`);
  const total = page.getByTestId("person-total");
  await expect(total).toBeVisible();
  await expect(page.locator("table.calendar")).toBeHidden();

  await page.getByRole("combobox", { name: "Necroforo" }).click();
  await page.getByRole("option", { name: name.toUpperCase() }).click();
  await expect(total).toHaveText("0");

  // Thursday 3 January 2030, a working day.
  const cell = page.getByRole("button", { name: /, 3 gennaio:/ });
  await cell.click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: /^1 servizio(?! in prova)/ }).click();
  await expect(sheet).toBeHidden();
  await expect(cell).toContainText("\\");
  await expect(total).toHaveText("1");

  await page.reload();
  await expect(total).toHaveText("1");

  await page.getByRole("button", { name: "Giorno" }).click();
  await expect(page).toHaveURL(/view=giorno/);
  await page
    .getByRole("button", { name: /3 gennaio/ })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: new RegExp(`^${name}.*: 1 servizio$`) }),
  ).toBeVisible();

  await deleteResource(desktop, bearerCard, name);
  await desktop.close();
});
