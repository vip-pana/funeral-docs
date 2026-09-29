import { expect, type Page, test } from "@playwright/test";

import { PASSWORD } from "./helpers";

/**
 * The password lives in the database, so this changes shared state every
 * other test logs in with: its project runs after all the others, and it puts
 * the original back whatever happens.
 */

const TEMP = "collaudo-temporanea-9182";

async function submit(
  page: Page,
  current: string,
  next: string,
  confirm = next,
) {
  await page.fill("#currentPassword", current);
  await page.fill("#newPassword", next);
  await page.fill("#confirmPassword", confirm);
  await page.click('button:has-text("Cambia password")');
}

test.beforeEach(async ({ page }) => {
  await page.goto("/settings");
});

test("la pagina ha la password e non più le autofunebri", async ({ page }) => {
  await expect(page.locator("h1")).toContainText("Impostazioni");
  await expect(page.locator("#newPassword")).toBeVisible();
  await expect(page.locator('button:has-text("Aggiungi")')).toHaveCount(0);
});

test("i cambi sbagliati sono rifiutati, sul campo giusto", async ({ page }) => {
  // The current password is checked, not just the session.
  await submit(page, "password-sbagliata", TEMP);
  await expect(page.locator("#currentPassword-error")).toContainText("errata");

  await submit(page, PASSWORD, TEMP, "qualcos-altro");
  await expect(page.locator("#confirmPassword-error")).toContainText(
    "non coincidono",
  );

  await submit(page, PASSWORD, "corta");
  await expect(page.locator("#newPassword-error")).toContainText(
    "almeno 8 caratteri",
  );
});

test("la nuova password sostituisce la vecchia", async ({ page }) => {
  let changed = false;
  try {
    await submit(page, PASSWORD, TEMP);
    await expect(
      page.locator("[data-sonner-toast]", { hasText: "aggiornata" }),
    ).toBeVisible();
    changed = true;

    await page.click('button:has-text("Esci")');
    await expect(page).toHaveURL(/\/login/);

    await page.fill("#password", PASSWORD);
    await page.click("button[type=submit]");
    await expect(
      page.getByRole("alert").filter({ hasText: "errata" }),
    ).toBeVisible();

    await page.fill("#password", TEMP);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/deceased$/);
  } finally {
    // Put it back, or every later run — and the next developer — is locked
    // out. Through the form, not assuming the change went through.
    if (changed) {
      await page.goto("/settings");
      await submit(page, TEMP, PASSWORD);
      await expect(
        page.locator("[data-sonner-toast]", { hasText: "aggiornata" }),
      ).toBeVisible();
    }
  }
});
