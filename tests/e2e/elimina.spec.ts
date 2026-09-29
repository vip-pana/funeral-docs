import { expect, test } from "@playwright/test";

import { createPractice, SAMPLE, unique } from "./helpers";

test("eliminare una scheda chiede conferma", async ({ page }, info) => {
  const lastName = unique(info, "Prova");
  const id = await createPractice(page, {
    ...SAMPLE,
    personFirstName: "Elimina",
    personLastName: lastName,
  });

  await page.click('button:has-text("Elimina")');
  await expect(page.locator('button:has-text("Confermi")')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${id}$`));

  await page.click('button:has-text("Annulla")');
  await expect(page.locator('button:has-text("Elimina")')).toBeVisible();

  await page.click('button:has-text("Elimina")');
  await page.click('button:has-text("Confermi")');
  await expect(page).toHaveURL(/\/deceased$/);
  // The table, not the whole body: the RSC payload in a <script> still holds
  // the page just left.
  await expect(page.locator("td", { hasText: lastName })).toHaveCount(0);

  expect((await page.request.get(`/deceased/${id}`)).status()).toBe(404);
});
