import { expect, test } from "@playwright/test";

import { addBearer, bearerCard, deleteResource, unique } from "./helpers";

/**
 * The page that used to be Impostazioni: vehicles and staff. The declarant and
 * the company moved to Clienti, the password to Impostazioni.
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/resources");
});

test("autofunebri e necrofori, senza dichiarante né password", async ({
  page,
}) => {
  await expect(page.locator("h1")).toContainText("Risorse");
  await expect(page.getByText("Autofunebri").first()).toBeVisible();
  await expect(page.getByText("Necrofori").first()).toBeVisible();

  // Two places saving the same thing is how they drift apart.
  await expect(page.locator("#companyName")).toHaveCount(0);
  await expect(page.locator("#ownerFirstName")).toHaveCount(0);
  await expect(page.locator("#newPassword")).toHaveCount(0);
});

// React empties the form after every action: on an error the plate typed and
// the Conducente tick used to disappear without a word.
test("un salvataggio rifiutato non svuota la targa", async ({ page }) => {
  await page.fill("#plate", "AB123CD");
  await page.click("form:has(#plate) button[type=submit]");
  await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#plate")).toHaveValue("AB123CD");
});

test("un salvataggio rifiutato non toglie la spunta Conducente", async ({
  page,
}) => {
  await page.click("#bearerIsDriver");
  await page.click("form:has(#bearerName) button[type=submit]");
  await expect(page.locator("#bearerName")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#bearerIsDriver")).toHaveAttribute(
    "data-state",
    "checked",
  );
});

test("dalla sidebar si raggiungono le altre pagine", async ({ page }) => {
  for (const [href, title] of [
    ["/clients", "Clienti"],
    ["/settings", "Impostazioni"],
    ["/resources", "Risorse"],
  ]) {
    await page.click(`a[href="${href}"]`);
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator("h1")).toContainText(title);
  }
});

test("la ricerca filtra i necrofori per nome", async ({ page }, info) => {
  const found = unique(info, "Nicolò Cercato");
  const other = unique(info, "Altro Nascosto");
  await addBearer(page, found);
  await addBearer(page, other);

  const row = (name: string) =>
    bearerCard(page).locator("tr", { hasText: name });
  // Lowercase and without the accent, as it is typed on a phone.
  await page.fill("#bearerSearch", "nicolo cercato");
  await expect(row(found)).toBeVisible();
  await expect(row(other)).toHaveCount(0);

  await page.fill("#bearerSearch", "nessuno si chiama cosi");
  await expect(
    bearerCard(page).getByText("Nessun necroforo trovato"),
  ).toBeVisible();

  await page.fill("#bearerSearch", "");
  await expect(row(found)).toBeVisible();
  await expect(row(other)).toBeVisible();

  await deleteResource(page, bearerCard, found);
  await deleteResource(page, bearerCard, other);
});
