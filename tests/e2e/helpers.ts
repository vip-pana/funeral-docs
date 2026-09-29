import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import JSZip from "jszip";

export const PASSWORD = process.env.TEST_PASSWORD ?? "sviluppo123";

/** Where the login project saves the session every test starts from. */
export const SESSION = "tests/e2e/.auth/session.json";

/** For the tests that start logged out, whatever the project gives them. */
export const LOGGED_OUT = { cookies: [], origins: [] };

/**
 * A name no other test is using: tests run in parallel against one database,
 * and a retry must not trip over what the failed attempt left behind.
 */
export function unique(info: TestInfo, prefix: string) {
  return `${prefix} ${info.workerIndex}-${info.retry}-${Date.now() % 1e6}`;
}

/**
 * Not an <input>: the trigger is a button that opens a popover with the
 * search, so `fill()` on the field fails. With no match, the typed text is
 * confirmed as is: the field also accepts municipalities not in the list.
 */
export async function pickComune(page: Page, field: string, comune: string) {
  await page.click(`#${field}`);
  const search = page.locator("[cmdk-input]");
  await search.fill(comune);

  const first = page.locator("[cmdk-item]").first();
  const found = await first
    .waitFor({ timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (found) await first.click();
  else await page.keyboard.press("Enter");
  await expect(search).toBeHidden();
}

/**
 * Not a native <select>: the trigger is a button that opens a menu, so
 * `selectOption()` fails.
 */
export async function pickSelect(page: Page, field: string, text: string) {
  await page.click(`#${field}`);
  await page.locator(`[role=option]:has-text("${text}")`).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}

/**
 * The seeded client the practice tests pick. Required on every record, so
 * without it the form fails validation instead of saving.
 */
export const SEED_CLIENT = "OO.FF. Rossi Mario";

/** Complete sample data, with a valid tax code. */
export const SAMPLE = {
  personFirstName: "Mario",
  personLastName: "Rossi",
  personTaxCode: "RSSMRA40C12D643D",
  personBirthDate: "1940-03-12",
  personBirthCity: "Foggia",
  personResidenceCity: "San Severo",
  personResidenceAddress: "Via Roma 15",
  personDeathDate: "2026-08-04",
  personDeathTime: "14:30",
  personDeathCity: "San Severo",
  personDeathPlace: "Ospedale Masselli",
  transportDate: "2026-08-06",
  transportTime: "09:00",
  transportPermitDate: "2026-08-05",
  funeralChurch: "Chiesa San Severino",
  destinationCity: "Foggia",
  destinationCemetery: "Cimitero Comunale",
};

const COMUNI = new Set([
  "personBirthCity",
  "personResidenceCity",
  "personDeathCity",
  "destinationCity",
  // The mandate, document 10.
  "mandateBirthCity",
  "mandateResidenceCity",
  "spouseBirthCity",
  "spouseResidenceCity",
  "widowedSpouseDeathCity",
]);

/**
 * Fills a practice form; municipalities go through the combobox. The client
 * is picked too, unless the caller opts out with `{ client: false }`.
 */
export async function fillPractice(
  page: Page,
  values: Record<string, string>,
  { client = SEED_CLIENT }: { client?: string | false } = {},
) {
  for (const [name, value] of Object.entries(values)) {
    if (COMUNI.has(name)) await pickComune(page, name, value);
    else await page.fill(`#${name}`, value);
  }
  if (client) await pickSelect(page, "clientId", client);
}

/** Saves the practice form already filled in and returns the new record's id. */
export async function savePractice(page: Page) {
  await page.click('button:has-text("Crea scheda")');
  await expect(page).toHaveURL(/\/deceased\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

/** A throwaway practice with the sample data, for tests that need one. */
export async function createPractice(
  page: Page,
  values: Record<string, string> = SAMPLE,
) {
  await page.goto("/deceased/new");
  await fillPractice(page, values);
  return savePractice(page);
}

export async function deletePractice(page: Page, id: string) {
  await page.goto(`/deceased/${id}`);
  await page.click('button:has-text("Elimina")');
  await page.click('button:has-text("Confermi")');
  await expect(page).toHaveURL(/\/deceased$/);
}

/** The text runs of a .docx, joined: what a reader of the document sees. */
export async function docxText(docx: Buffer) {
  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file("word/document.xml")!.async("string");
  return [...xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((m) => m[1])
    .join("");
}

/** One generated document of a practice, as text. */
export async function documentText(page: Page, id: string, doc: string) {
  const res = await page.request.get(`/api/deceased/${id}/generate?doc=${doc}`);
  expect(res.ok()).toBe(true);
  return docxText(await res.body());
}

/**
 * The options a Select offers, closing it again. For checking that one is
 * missing, which `pickSelect` cannot do.
 */
export async function selectOptions(page: Page, field: string) {
  await page.click(`#${field}`);
  await page.getByRole("listbox").waitFor();
  const options = await page.getByRole("option").allTextContents();
  await page.keyboard.press("Escape");
  return options;
}

// The two cards on /resources have an identical "Aggiungi" button and a
// table each: everything is scoped to one card.
export const vehicleCard = (page: Page) =>
  page.locator("[data-slot=card]:has(#plate)");
export const bearerCard = (page: Page) =>
  page.locator("[data-slot=card]:has(#bearerName)");

/** A plate no other test is using, in the uppercase the form stores. */
export function uniquePlate(info: TestInfo) {
  return `E${info.workerIndex}${info.retry}${String(Date.now() % 1e5).padStart(5, "0")}`;
}

export async function addVehicle(page: Page, name: string, plate: string) {
  await page.goto("/resources");
  const card = vehicleCard(page);
  await page.fill("#name", name);
  await page.fill("#plate", plate);
  await card.getByRole("button", { name: "Aggiungi" }).click();
  await expect(card.locator("tr", { hasText: plate })).toBeVisible();
}

export async function addBearer(
  page: Page,
  name: string,
  { driver = false, contract = false } = {},
) {
  await page.goto("/resources");
  const card = bearerCard(page);
  await page.fill("#bearerName", name);
  if (driver) await page.click("#bearerIsDriver");
  if (contract) await page.click("#bearerHasContract");
  await card.getByRole("button", { name: "Aggiungi" }).click();
  await expect(card.locator("tr", { hasText: name })).toBeVisible();
}

/** Deletes the row holding `text` from one of the /resources cards. */
export async function deleteResource(
  page: Page,
  card: (page: Page) => Locator,
  text: string,
) {
  await page.goto("/resources");
  const row = card(page).locator("tr", { hasText: text });
  await row.getByRole("button", { name: "Elimina" }).click();
  await row.getByRole("button", { name: "Confermi?" }).click();
  await expect(row).toHaveCount(0);
}
