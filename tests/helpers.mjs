/**
 * Not an <input>: the trigger is a button that opens a popover with the
 * search, so `fill()` on the field fails.
 */
export async function pickComune(page, fieldName, comune) {
  await page.click(`#${fieldName}`);
  await page.waitForSelector("[cmdk-input]", { timeout: 5000 });
  await page.fill("[cmdk-input]", comune);

  // Wait for a result; if none arrives, confirm the typed text (the field
  // also accepts municipalities that are not in the list).
  const found = await page
    .waitForSelector("[cmdk-item]", { timeout: 4000 })
    .then(() => true)
    .catch(() => false);

  if (found) await page.click("[cmdk-item]");
  else await page.keyboard.press("Enter");

  await page.waitForTimeout(300);
}

/**
 * Not a native <select>: the trigger is a button that opens a menu, so
 * `selectOption()` fails. If the entry is absent the menu closes without
 * picking anything — the caller decides whether that is a problem.
 */
export async function pickSelect(page, fieldName, text) {
  await page.click(`#${fieldName}`);
  const found = await page
    .waitForSelector(`[role=option]:has-text("${text}")`, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  if (found) await page.click(`[role=option]:has-text("${text}")`);
  else await page.keyboard.press("Escape");

  await page.waitForTimeout(250);
  return found;
}

/**
 * The seeded client the practice suites pick. Required on every record, so
 * without it the form fails validation instead of saving.
 */
export const SEED_CLIENT = "OO.FF. Rossi Mario";

/** Picks the seeded client on a practice form. */
export async function pickClient(page, text = SEED_CLIENT) {
  return pickSelect(page, "clientId", text);
}

/**
 * Fills a practice form; municipalities go through the combobox.
 *
 * The client is picked too, unless the caller passes one in `values` or opts
 * out with `{client: false}`: it is required, so a form filled without it does
 * not save and every suite that only wanted a throwaway record would hang on
 * the navigation that never happens.
 */
export async function fillPractice(page, values, { client = SEED_CLIENT } = {}) {
  const comuni = new Set([
    "personBirthCity",
    "personResidenceCity",
    "personDeathCity",
    "destinationCity",
  ]);

  for (const [name, value] of Object.entries(values)) {
    if (comuni.has(name)) await pickComune(page, name, value);
    else await page.fill(`#${name}`, value);
  }

  if (client) await pickClient(page, client);
}

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

/** Logs in and lands on the practices page. */
export async function login(page, base) {
  await page.goto(`${base}/login`);
  await page.fill("#password", process.env.TEST_PASSWORD ?? "sviluppo123");
  await Promise.all([
    page.waitForURL(/deceased/, { timeout: 15000 }),
    page.click('button[type=submit]'),
  ]);
}
