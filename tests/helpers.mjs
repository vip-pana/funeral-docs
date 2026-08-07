/**
 * Funzioni condivise dalle suite.
 */

/**
 * Sceglie un comune dal combobox.
 *
 * Non e' un <input>: il trigger e' un pulsante che apre un popover con la
 * ricerca, quindi `fill()` sul campo fallisce.
 */
export async function pickComune(page, fieldName, comune) {
  await page.click(`#${fieldName}`);
  await page.waitForSelector("[cmdk-input]", { timeout: 5000 });
  await page.fill("[cmdk-input]", comune);

  // Attende un risultato; se non arriva, conferma il testo digitato (il campo
  // accetta anche comuni non in elenco).
  const found = await page
    .waitForSelector("[cmdk-item]", { timeout: 4000 })
    .then(() => true)
    .catch(() => false);

  if (found) await page.click("[cmdk-item]");
  else await page.keyboard.press("Enter");

  await page.waitForTimeout(300);
}

/**
 * Sceglie una voce da un Select di shadcn.
 *
 * Non e' un <select> nativo: il trigger e' un pulsante che apre un menu, e
 * `selectOption()` fallisce. Se la voce non c'e' il menu si richiude senza
 * scegliere nulla — il chiamante decide se e' un problema.
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

/** Compila un form pratica; i comuni passano dal combobox. */
export async function fillPractice(page, values) {
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
}

/** Dati di prova completi, con codice fiscale valido. */
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

/** Accede e resta sulla pagina delle pratiche. */
export async function login(page, base) {
  await page.goto(`${base}/login`);
  await page.fill("#password", process.env.TEST_PASSWORD ?? "sviluppo123");
  await Promise.all([
    page.waitForURL(/pratiche/, { timeout: 15000 }),
    page.click('button[type=submit]'),
  ]);
}
