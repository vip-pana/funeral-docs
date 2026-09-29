import { expect, test } from "@playwright/test";

import {
  deletePractice,
  deleteResource,
  documentText,
  pickSelect,
  SAMPLE,
  fillPractice,
  savePractice,
  uniquePlate,
  vehicleCard,
} from "./helpers";

test("un'autofunebre senza dati non si aggiunge", async ({ page }) => {
  await page.goto("/resources");
  await vehicleCard(page).getByRole("button", { name: "Aggiungi" }).click();
  await expect(page.locator("[role=alert]").first()).toBeVisible();
});

/**
 * The last check is the central one: once the hearse is deleted, the plate
 * must stay in documents already issued. That is the reason the practice
 * keeps a copy of the plate rather than just the reference.
 */
test("la targa arriva sulla scheda e resta dopo l'eliminazione del mezzo", async ({
  page,
}, info) => {
  const plate = uniquePlate(info);

  // Typed in lowercase: the list shows it in capitals.
  await page.goto("/resources");
  const card = vehicleCard(page);
  await page.fill("#name", "Mercedes Vito");
  await page.fill("#plate", plate.toLowerCase());
  await card.getByRole("button", { name: "Aggiungi" }).click();
  await expect(
    page.locator("[data-sonner-toast]", { hasText: "Autofunebre aggiunta" }),
  ).toBeVisible();
  await expect(card.locator("tr", { hasText: plate })).toBeVisible();

  await page.goto("/deceased/new");
  await pickSelect(page, "vehicleId", plate);
  await fillPractice(page, SAMPLE);
  const id = await savePractice(page);
  expect(await documentText(page, id, "2")).toContain(plate);

  await deleteResource(page, vehicleCard, plate);
  expect(await documentText(page, id, "2")).toContain(plate);

  // The practice says so instead of staying silent. The description of the
  // hearse field alone: the page has one per field.
  await page.goto(`/deceased/${id}`);
  const hint = page.locator(
    "[data-slot=field]:has(#vehicleId) [data-slot=field-description]",
  );
  await expect(hint).toContainText("non piu'");
  await expect(hint).toContainText(plate);

  await deletePractice(page, id);
});
