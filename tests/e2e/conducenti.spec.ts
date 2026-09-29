import { expect, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deletePractice,
  deleteResource,
  documentText,
  fillPractice,
  pickSelect,
  SAMPLE,
  savePractice,
  selectOptions,
  unique,
} from "./helpers";

/**
 * There is no separate driver list: anyone in Necrofori can drive, and the
 * "Conducente" checkbox on the row is what puts them in the practice's Select.
 */

test("un necroforo senza nome non si aggiunge", async ({ page }) => {
  await page.goto("/resources");
  await bearerCard(page).getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.locator("[role=alert]").first()).toBeVisible();
});

test("la spunta Conducente, non la riga, lo mette nel Select", async ({
  page,
}, info) => {
  const driver = unique(info, "Giuseppe Bianchi");
  await addBearer(page, driver, { driver: true });
  await expect(
    page.locator("[data-sonner-toast]", { hasText: "Necroforo aggiunto" }),
  ).toBeVisible();

  const box = bearerCard(page)
    .locator("tr", { hasText: driver })
    .locator("[id^=bearerIsDriver-]");
  await expect(box).toHaveAttribute("data-state", "checked");

  await page.goto("/deceased/new");
  expect(await selectOptions(page, "driverId")).toContainEqual(
    expect.stringContaining(driver),
  );

  await page.goto("/resources");
  await box.click();
  await expect(box).toHaveAttribute("data-state", "unchecked");
  await page.goto("/deceased/new");
  expect(await selectOptions(page, "driverId")).not.toContainEqual(
    expect.stringContaining(driver),
  );

  await deleteResource(page, bearerCard, driver);
});

/**
 * Once the bearer is deleted, the name must stay in documents already issued.
 * That is the reason the practice keeps a copy of the name rather than just
 * the reference.
 */
test("il conducente arriva sulla scheda e resta dopo l'eliminazione", async ({
  page,
}, info) => {
  const driver = unique(info, "Giuseppe Bianchi");
  await addBearer(page, driver, { driver: true });

  await page.goto("/deceased/new");
  await pickSelect(page, "driverId", driver);
  await fillPractice(page, SAMPLE);
  const id = await savePractice(page);
  // The driver only appears in document 4.
  expect(await documentText(page, id, "4")).toContain(driver);

  await deleteResource(page, bearerCard, driver);
  expect(await documentText(page, id, "4")).toContain(driver);

  await page.goto(`/deceased/${id}`);
  const hint = page.locator(
    "[data-slot=field]:has(#driverId) [data-slot=field-description]",
  );
  await expect(hint).toContainText("non piu'");
  await expect(hint).toContainText(driver);

  await deletePractice(page, id);
});
