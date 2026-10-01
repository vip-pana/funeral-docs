import { expect, test } from "@playwright/test";

import { bearerCard, deleteResource, unique } from "./helpers";

/**
 * A bearer's note: written on Risorse, from the add form, the row or the edit
 * dialog, and read under the month's calendar, but never on the printed sheet.
 */

test.use({ viewport: { width: 1600, height: 960 } });

test("la nota del necroforo compare sotto il calendario, non in stampa", async ({
  page,
}, info) => {
  const name = unique(info, "Mario Nota");
  const notes = page.getByTestId("calendar-notes");
  const noteOf = () => notes.locator("li", { hasText: name.toUpperCase() });

  await page.goto("/resources");
  const card = bearerCard(page);
  await page.fill("#bearerName", name);
  await page.fill("#bearerNote", "solo la mattina");
  await card.getByRole("button", { name: "Aggiungi" }).click();
  await expect(card.locator("tr", { hasText: name })).toBeVisible();

  await page.goto("/calendar?view=mese");
  await expect(noteOf()).toContainText("solo la mattina");

  // Printed, the list is gone.
  await page.emulateMedia({ media: "print" });
  await expect(notes).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  // From the edit dialog.
  await page.goto("/resources");
  const row = card.locator("tr", { hasText: name });
  await row.getByRole("button", { name: "Modifica" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#editBearerNote").fill("non il sabato");
  await dialog.getByRole("button", { name: "Salva" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/calendar?view=mese");
  await expect(noteOf()).toContainText("non il sabato");

  // From the row, saved on blur.
  await page.goto("/resources");
  const input = row.getByRole("textbox", { name: `${name}: nota` });
  await expect(input).toHaveValue("non il sabato");
  await input.fill("guida il furgone");
  await input.blur();
  await expect(
    page.locator("[data-sonner-toast]", { hasText: "Nota salvata" }),
  ).toBeVisible();

  await page.goto("/calendar?view=mese");
  await expect(noteOf()).toContainText("guida il furgone");

  await deleteResource(page, bearerCard, name);
});
