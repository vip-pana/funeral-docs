import { expect, test } from "@playwright/test";

import { addBearer, bearerCard, deleteResource, unique } from "./helpers";

/**
 * A bearer on a contract gets a single ferie entry, written as a bare F that
 * adds nothing to the total. Unticking the box scores the same day again,
 * because the points are worked out when shown.
 */

// Wednesday 9 December 2026, a working day: F1 once the contract is gone.
const MONTH = "2026-12";
const DAY = "9 dicembre";

test.use({ viewport: { width: 1600, height: 960 } });

test("con il contratto le ferie sono una F senza punti", async ({
  page,
}, info) => {
  const name = unique(info, "Mario Contratto");
  await addBearer(page, name, { contract: true });
  const contractBox = bearerCard(page)
    .locator("tr", { hasText: name })
    .locator("[id^=bearerHasContract-]");
  await expect(contractBox).toHaveAttribute("data-state", "checked");

  const cell = page.getByRole("button", {
    name: new RegExp(`^${name}, ${DAY}:`),
  });
  const total = page
    .locator("tr", { has: page.locator("th", { hasText: name.toUpperCase() }) })
    .locator("td")
    .first();

  await page.goto(`/calendar?month=${MONTH}&view=mese`);
  await cell.click();
  const menu = page.locator("[data-slot=popover-content]");
  const entries = await menu.locator("button").allTextContents();
  expect(entries.filter((t) => t.startsWith("Ferie"))).toHaveLength(1);
  // The whole day, first in the menu: the half days below are named
  // "Ferie mattina" and "Ferie pomeriggio".
  await menu
    .getByRole("button", { name: /^Ferie/ })
    .first()
    .click();
  await expect(cell).toHaveText("F");

  await page.reload();
  await expect(cell).toHaveText("F");
  await expect(total).toHaveText("");

  // Unticking the box scores the same day.
  await page.goto("/resources");
  await contractBox.click();
  await expect(contractBox).toHaveAttribute("data-state", "unchecked");
  await page.goto(`/calendar?month=${MONTH}&view=mese`);
  await expect(cell).toHaveText(/^F1/);
  await expect(total).toHaveText("1");

  // Deleting the bearer takes their days too.
  await deleteResource(page, bearerCard, name);
});
