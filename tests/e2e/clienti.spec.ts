import { expect, test } from "@playwright/test";

import { pickComune, unique } from "./helpers";

test("il form vuoto non si salva", async ({ page }) => {
  await page.goto("/clients/new");
  await page.click('button:has-text("Crea cliente")');
  await expect
    .poll(() => page.locator("[role=alert]").count())
    .toBeGreaterThan(3);
  await expect(page).toHaveURL(/\/clients\/new$/);
});

test("un cliente si crea, si modifica, si sceglie su un defunto e si elimina", async ({
  page,
}, info) => {
  const company = unique(info, "OO.FF. Collaudo");

  // --- create ---
  await page.goto("/clients/new");
  for (const [k, v] of Object.entries({
    firstName: "Giulio",
    middleName: "M.",
    lastName: "Collaudo",
    companyName: company,
    birthDate: "1970-01-15",
    address: "Via Prova 1",
    postalCode: "71016",
    idType: "CARTA D'IDENTITA",
    idNumber: "CA00001XX",
    idIssuer: "COMUNE DI SAN SEVERO",
    idDate: "2020-02-02",
  }))
    await page.fill(`#${k}`, v);
  for (const f of ["birthCity", "companyCity", "city", "cityName"]) {
    await pickComune(page, f, "San Severo");
  }
  await page.click('button:has-text("Crea cliente")');
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
  await expect(page.locator("h1")).toContainText(company);
  const url = page.url();

  // --- the values persist ---
  await page.reload();
  await expect(page.locator("#firstName")).toHaveValue("Giulio");
  await expect(page.locator("#idNumber")).toHaveValue("CA00001XX");
  // The combobox writes into a hidden input.
  await expect(page.locator("input[name=birthCity]")).toHaveValue("San Severo");

  // --- edit ---
  await page.fill("#address", "Via Modificata 9");
  await page.click('button:has-text("Salva modifiche")');
  await expect(
    page.locator("[data-sonner-toast]", { hasText: "aggiornato" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("#address")).toHaveValue("Via Modificata 9");

  // --- in the list, with its own Apri button ---
  await page.goto("/clients");
  const opener = page.locator(`tr:has-text("${company}") a:has-text("Apri")`);
  await expect(opener).toHaveCount(1);
  await opener.click();
  await expect(page).toHaveURL(url);

  // --- in the picker on a record ---
  await page.goto("/deceased/new");
  await page.click("#clientId");
  await expect(
    page.locator(`[role=option]:has-text("${company}")`),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // --- delete ---
  await page.goto(url);
  await page.click('button:has-text("Elimina")');
  await page.click('button:has-text("Confermi")');
  await expect(page).toHaveURL(/\/clients$/);
  // The table, not the whole body: the body carries the RSC payload inside a
  // <script>, where the name of the page just left is still serialised.
  await expect(page.locator("td", { hasText: company })).toHaveCount(0);
});
