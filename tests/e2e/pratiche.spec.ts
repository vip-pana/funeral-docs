import { readFile } from "node:fs/promises";

import { type Download, expect, test } from "@playwright/test";

import {
  addBearer,
  addVehicle,
  bearerCard,
  createPractice,
  deletePractice,
  deleteResource,
  docxText,
  fillPractice,
  pickSelect,
  SAMPLE,
  savePractice,
  SEED_CLIENT,
  unique,
  uniquePlate,
  vehicleCard,
} from "./helpers";

const read = async (d: Download) => docxText(await readFile((await d.path())!));

test("una scheda completa arriva in tutti i documenti", async ({
  page,
}, info) => {
  // Its own hearse and driver, so plate and name have something to reach.
  const plate = uniquePlate(info);
  const driver = unique(info, "Giuseppe Bianchi");
  await addVehicle(page, "Mercedes Vito", plate);
  await addBearer(page, driver, { driver: true });

  await page.goto("/deceased/new");
  await expect(page.locator("h1")).toContainText("Nuovo defunto");
  await fillPractice(page, {
    ...SAMPLE,
    // The mandate, document 10. The spouse's details only appear once the
    // marital status is picked, below.
    mandateFirstName: "Anna",
    mandateLastName: "Bianchi",
    mandateRelationship: "figlia",
    mandateBirthDate: "1970-05-02",
    mandateBirthCity: "San Severo",
    mandateResidenceCity: "San Severo",
    mandatePhone: "3331234567",
    mandateTaxCode: "BNCNNA70E42I158O",
    mandateIdType: "Carta d'identita",
    mandateIdNumber: "CA1577CS",
    personFatherName: "Giuseppe",
    personMotherName: "Lucia Verdi",
    personProfession: "Contadino",
    transportDeparturePlace: "Obitorio comunale",
    funeralStopTime: "09:30",
    // The id type is prefilled: this checks the default reaches the document.
    personIdNumber: "CA9988776",
  });
  await expect(page.locator("#clientId")).toContainText(SEED_CLIENT);

  // Document 10's two tick-box groups: picking one reveals its fields.
  await pickSelect(page, "personMaritalStatus", "Coniugato/a");
  await fillPractice(
    page,
    {
      spouseName: "Carla Neri",
      marriageDate: "1965-06-20",
      spouseBirthDate: "1944-01-15",
      spouseBirthCity: "Torremaggiore",
      spouseResidenceCity: "San Severo",
    },
    { client: false },
  );
  await pickSelect(page, "bodyDestination", "Tumulata in tomba");
  await fillPractice(
    page,
    { concessionType: "perpetua", concessionNumber: "1234" },
    { client: false },
  );
  await pickSelect(page, "vehicleId", plate);
  await pickSelect(page, "driverId", driver);
  const id = await savePractice(page);
  await expect(page.locator("h1")).toContainText("Rossi");
  await expect(page.locator("#destinationProvince")).toHaveValue("FG");

  // Scoped to id^=doc-: the form has its own checkboxes for the bearers.
  // Counted, so adding a template does not break this test.
  const docs = page.locator("[role=checkbox][id^=doc-]");
  const n = await docs.count();

  // --- one document ---
  await docs.nth(0).check();
  for (let i = 1; i < n; i++) await docs.nth(i).uncheck();
  const [one] = await Promise.all([
    page.waitForEvent("download"),
    page.click('button:has-text("Scarica")'),
  ]);
  expect(one.suggestedFilename()).toMatch(/\.docx$/);
  const t1 = await read(one);
  expect(t1).toContain("Mario");
  expect(t1).toContain("Rossi");
  expect(t1).toContain("12/03/1940");
  expect(t1).not.toMatch(/\{[^}]*\}/);

  // --- all of them: separate files, not one zip ---
  const got: Download[] = [];
  page.on("download", (d) => got.push(d));
  for (let i = 0; i < n; i++) await docs.nth(i).check();
  await page.click('button:has-text("Scarica")');
  // The panel fetches them one at a time.
  await expect.poll(() => got.length, { timeout: n * 4000 }).toBe(n);
  const names = got.map((d) => d.suggestedFilename());
  expect(names.every((f) => f.endsWith(".docx"))).toBe(true);
  expect(new Set(names).size).toBe(n);
  const doc = (k: string) =>
    read(got.find((d) => d.suggestedFilename().includes(`_${k}_`))!);

  // Document 4 uses every company field, read live from the client.
  const t4 = await doc("4");
  expect(t4).toContain(SEED_CLIENT);
  expect(t4).toContain(plate);
  expect(t4).toContain(driver);
  expect(t4).toContain("RSSMRA40C12D643D");
  expect(t4).not.toMatch(/\{[^}]*\}/);

  // Document 10 is the mandate: tick boxes and a derived age.
  const t10 = await doc("10");
  expect(t10).toContain("Anna");
  expect(t10).toContain("figlia");
  expect(t10).toContain("Lucia Verdi");
  // 12/03/1940 to 04/08/2026: the birthday had already come round.
  expect(t10).toContain("di anni 86");
  // One tick and three empty boxes per group.
  expect(t10.match(/☒/g)).toHaveLength(2);
  expect(t10.match(/□/g)).toHaveLength(6);
  // Stored once, printed under the ticked branch only.
  expect(t10.match(/Carla Neri/g)).toHaveLength(1);
  expect(t10).toContain("perpetua");
  expect(t10).toContain("1234");
  // `&apos;` in the XML, which is not decoded here.
  expect(t10).toMatch(/Carta d(&apos;|')identità/);
  expect(t10).toContain("CA9988776");
  // The invoice holder is a pen line again: nobody filled it in.
  expect(t10).toContain("Nome e Cognome ____");
  expect(t10).not.toMatch(/\{[^}]*\}/);

  // Document 11 names the firm's seat and the hearse model, and holds an
  // image — whose XML carries GUIDs in braces, outside the text runs.
  const t11 = await doc("11");
  expect(t11).toContain("Viale 2 Giugno 264");
  expect(t11).toContain("Mercedes Vito");
  expect(t11).toContain(plate);
  expect(t11).toContain("San Severo");
  expect(t11).toContain("SAN SEVERO");
  // The address fields carry their own "Via".
  expect(t11).not.toContain("via Via");
  expect(t11).not.toMatch(/\{[^}]*\}/);

  await deletePractice(page, id);
  await deleteResource(page, vehicleCard, plate);
  await deleteResource(page, bearerCard, driver);
});

test("una modifica resta e la scheda compare in elenco", async ({
  page,
}, info) => {
  const lastName = unique(info, "Rossi");
  const id = await createPractice(page, {
    ...SAMPLE,
    personLastName: lastName,
  });

  await page.fill("#personDeathPlace", "Abitazione");
  await page.click('button:has-text("Salva modifiche")');
  await expect(
    page.locator("[data-sonner-toast]", { hasText: "aggiornato" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("#personDeathPlace")).toHaveValue("Abitazione");

  await page.goto("/deceased");
  await expect(page.locator("td", { hasText: lastName })).toBeVisible();

  await deletePractice(page, id);
});

// React empties the form after the action: client and sex used to go back to
// "no client" and "male" without a word.
test("il form vuoto non si salva e non perde cliente e sesso", async ({
  page,
}) => {
  await page.goto("/deceased/new");
  await pickSelect(page, "clientId", SEED_CLIENT);
  await pickSelect(page, "personSex", "Femminile");
  await page.click('button:has-text("Crea scheda")');
  await expect
    .poll(() => page.locator("[role=alert]").count())
    .toBeGreaterThan(3);
  await expect(page).toHaveURL(/\/deceased\/new$/);
  await expect(page.locator("#clientId")).toContainText(SEED_CLIENT);
  await expect(page.locator("#personSex")).toContainText("Femminile");

  // An invalid tax code fills nothing in.
  await page.fill("#personTaxCode", "ABC");
  await page.locator("#personFirstName").focus();
  await expect(page.locator("#personBirthDate")).toHaveValue("");
});
