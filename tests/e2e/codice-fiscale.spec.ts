import { expect, test } from "@playwright/test";

import {
  deletePractice,
  fillPractice,
  pickComune,
  pickSelect,
  savePractice,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/deceased/new");
});

test("Calcola si accende con i dati e non calcola da solo", async ({
  page,
}) => {
  const button = page.locator('button:has-text("Calcola")');
  const taxCode = page.locator("#personTaxCode");
  await expect(button).toBeDisabled();

  await page.fill("#personFirstName", "Mario");
  await page.fill("#personLastName", "Rossi");
  await page.fill("#personBirthDate", "1940-03-12");
  await expect(button).toBeDisabled();

  await pickComune(page, "personBirthCity", "Foggia");
  await expect(button).toBeEnabled();
  await expect(taxCode).toHaveValue("");

  await button.click();
  await expect(taxCode).toHaveValue("RSSMRA40C12D643D");

  // A woman's day of birth goes up by 40.
  await pickSelect(page, "personSex", "Femminile");
  await button.click();
  await expect(taxCode).toHaveValue(/^.{9}52/);
});

// A reopened practice has the municipality's name, not its cadastral code.
test("su una scheda riaperta calcola dal nome del comune", async ({ page }) => {
  await fillPractice(page, {
    personFirstName: "Giuseppe",
    personLastName: "Verdi",
    personBirthDate: "1940-03-12",
    personBirthCity: "Foggia",
    personDeathDate: "2026-08-01",
    personDeathTime: "10:00",
    personDeathPlace: "Ospedale",
    personResidenceAddress: "Via X",
    transportDate: "2026-08-03",
    transportTime: "08:00",
    transportPermitDate: "2026-08-02",
    destinationCemetery: "Comunale",
    personResidenceCity: "San Severo",
    personDeathCity: "San Severo",
    destinationCity: "Foggia",
  });
  await page.locator('button:has-text("Calcola")').click();
  await expect(page.locator("#personTaxCode")).toHaveValue(/^.{16}$/);
  const id = await savePractice(page);

  await page.reload();
  const button = page.locator('button:has-text("Calcola")');
  await expect(button).toBeEnabled();
  await page.fill("#personTaxCode", "");
  await button.click();
  await expect(page.locator("#personTaxCode")).toHaveValue(/^.{16}$/);

  await deletePractice(page, id);
});
