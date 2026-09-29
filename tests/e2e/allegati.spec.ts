import { expect, test } from "@playwright/test";

import {
  addBearer,
  bearerCard,
  deletePractice,
  deleteResource,
  documentText,
  fillPractice,
  SAMPLE,
  savePractice,
  unique,
} from "./helpers";

/**
 * Attachments 2 and 3 of L.R. 34/2008 (documents 6 and 7) and the bearer
 * list. The bearer names must stay in a document already issued after the
 * bearer is removed from the list, which is why the record copies the names
 * instead of just the ids.
 */
test("gli allegati 2 e 3 escono compilati, con i necrofori", async ({
  page,
}, info) => {
  const bearer = unique(info, "Paolo Neri");
  await addBearer(page, bearer);

  await page.goto("/deceased/new");
  await fillPractice(page, SAMPLE);
  // The bearer is a checkbox, not a Select: several are chosen at once.
  await page.locator(`label:has-text("${bearer}") [role=checkbox]`).click();
  const id = await savePractice(page);

  for (const doc of ["6", "7"]) {
    const txt = await documentText(page, id, doc);
    expect(txt).toContain("Rossi");
    expect(txt).toContain("Mario");
    // A raw placeholder means a field is declared but never filled.
    expect(txt).not.toMatch(/\{[^}]*\}/);
    // Both forms are issued by San Severo: fixed text, not the client's city.
    expect(txt).toContain(
      doc === "6" ? "COMUNE DI SAN SEVERO" : "CITTA DI SAN SEVERO",
    );
    expect(txt).toContain("San Severo il ");
  }

  const doc7 = await documentText(page, id, "7");
  expect(doc7).toContain(bearer);
  // Printed by the template as fixed text, not typed into the record.
  expect(doc7).toContain("INCARICATO");
  // Derived from the birth municipality, never typed in.
  expect(doc7).toContain("(FG)");

  await deleteResource(page, bearerCard, bearer);
  expect(await documentText(page, id, "7")).toContain(bearer);

  await deletePractice(page, id);
});
