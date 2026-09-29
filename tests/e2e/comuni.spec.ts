import { expect, test } from "@playwright/test";

import { pickComune } from "./helpers";

test.describe("API dei comuni", () => {
  test("ricerca per nome", async ({ request }) => {
    const r = await request.get("/api/municipalities?q=fogg");
    expect(r.ok()).toBe(true);
    const names = (await r.json()).map((c: { nome: string }) => c.nome);
    expect(names).toContain("Foggia");
  });

  test("una ricerca troppo corta non restituisce nulla", async ({
    request,
  }) => {
    const r = await request.get("/api/municipalities?q=f");
    expect(await r.json()).toEqual([]);
  });

  test("codice catastale → comune", async ({ request }) => {
    const r = await request.get("/api/municipalities?codice=D643");
    expect(await r.json()).toMatchObject({ nome: "Foggia", provincia: "FG" });
  });

  test("un codice ignoto dà 404", async ({ request }) => {
    const r = await request.get("/api/municipalities?codice=ZZZZ");
    expect(r.status()).toBe(404);
  });

  // The exact name beats the prefix: Germagnano and Germignaga stay below.
  test("uno stato estero con quel nome va in testa", async ({ request }) => {
    const r = await request.get("/api/municipalities?q=germania");
    const [first] = await r.json();
    expect(first).toMatchObject({ nome: "Germania", provincia: "EE" });
  });

  test("codice estero → stato", async ({ request }) => {
    const r = await request.get("/api/municipalities?codice=Z112");
    expect(await r.json()).toMatchObject({ nome: "Germania", provincia: "EE" });
  });

  // Someone born in Yugoslavia has that code printed on their health card.
  test("uno stato che non esiste più si trova ancora", async ({ request }) => {
    const r = await request.get("/api/municipalities?codice=Z118");
    expect(await r.json()).toMatchObject({ storico: true });
  });
});

test.describe("scheda del defunto", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/deceased/new");
  });

  test("il codice fiscale compila data e comune di nascita", async ({
    page,
  }) => {
    await page.fill("#personTaxCode", "RSSMRA40C12D643D");
    await page.locator("#personLastName").focus();
    await expect(page.locator("#personBirthDate")).toHaveValue("1940-03-12");
    await expect(page.locator("input[name=personBirthCity]")).toHaveValue(
      "Foggia",
    );
  });

  test("un codice fiscale estero compila il paese di nascita", async ({
    page,
  }) => {
    await page.fill("#personTaxCode", "RSSMRA40C12Z112F");
    await page.locator("#personLastName").focus();
    await expect(page.locator("input[name=personBirthCity]")).toHaveValue(
      "Germania",
    );
  });

  test("la provincia arriva dal comune di destinazione", async ({ page }) => {
    await pickComune(page, "destinationCity", "Milano");
    await expect(page.locator("#destinationProvince")).toHaveValue("MI");
  });

  test("una destinazione estera ha provincia EE", async ({ page }) => {
    await pickComune(page, "destinationCity", "Romania");
    await expect(page.locator("#destinationProvince")).toHaveValue("EE");
  });

  test("un comune fuori elenco è accettato così com'è", async ({ page }) => {
    await pickComune(page, "personResidenceCity", "Borgo Inventato");
    await expect(page.locator("input[name=personResidenceCity]")).toHaveValue(
      "Borgo Inventato",
    );
  });
});
