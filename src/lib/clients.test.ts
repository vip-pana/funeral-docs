import { describe, expect, it } from "vitest";

import { clientLabel, clientNameOf, personName } from "./client-name";
import { clientValues } from "./clients";
import type { Client } from "./db/schema";

/**
 * Only the pure functions are tested here: `listClients` and `getClient` read
 * the database and are covered end-to-end by tests/clienti.mjs.
 */

const CLIENT: Client = {
  id: "6a3f0c2e-1b4d-4e9a-8c7f-2d5b8e1a4c60",
  firstName: "Mario",
  middleName: "F.",
  lastName: "Rossi",
  companyName: "OO.FF. Rossi Mario",
  companyCity: "San Severo",
  city: "San Severo",
  cityName: "San Severo",
  birthDate: "1980-03-15",
  birthCity: "San Severo",
  address: "Via Giuseppe Verdi 12",
  postalCode: "71016",
  idType: "CARTA D'IDENTITA",
  idNumber: "AA1234567",
  idIssuer: "COMUNE DI SAN SEVERO",
  idDate: "2020-06-10",
  citizenship: "italiana",
  createdAt: "2026-08-07 10:00:00",
  updatedAt: "2026-08-07 10:00:00",
};

describe("clientValues", () => {
  /**
   * The keys are the placeholders inside the .docx, which kept the `owner`
   * prefix from when these values came from a single-row `owner` table. This
   * mapping is the only thing holding the two apart: a column renamed here
   * without renaming the placeholder leaves a hole in the printed documents.
   */
  it("maps the client onto the owner-prefixed placeholders", () => {
    expect(clientValues(CLIENT)).toEqual({
      ownerFirstName: "Mario",
      ownerMiddleName: "F.",
      ownerLastName: "Rossi",
      ownerCompanyName: "OO.FF. Rossi Mario",
      ownerCompanyCity: "San Severo",
      ownerCity: "San Severo",
      ownerCityName: "San Severo",
      // Documents 6 and 7 identify the declarant in full.
      ownerBirthDate: "1980-03-15",
      ownerBirthCity: "San Severo",
      ownerAddress: "Via Giuseppe Verdi 12",
      ownerPostalCode: "71016",
      ownerIdType: "CARTA D'IDENTITA",
      ownerIdNumber: "AA1234567",
      ownerIdIssuer: "COMUNE DI SAN SEVERO",
      ownerIdDate: "2020-06-10",
      // Document 9.
      ownerCitizenship: "italiana",
    });
  });

  /**
   * The plate and the driver name are picked in each practice, and the request
   * date is filled in there too. If any of them leaked out of here it would
   * override the practice's own value in the generation route.
   */
  it("leaves out what belongs to the practice", () => {
    const values = clientValues(CLIENT);
    expect(values).not.toHaveProperty("ownerVehiclePlate");
    expect(values).not.toHaveProperty("ownerDriverName");
    expect(values).not.toHaveProperty("ownerRequestDate");
  });

  it("leaves out the database bookkeeping", () => {
    const values = clientValues(CLIENT);
    expect(values).not.toHaveProperty("id");
    expect(values).not.toHaveProperty("createdAt");
    expect(values).not.toHaveProperty("updatedAt");
  });

  /** Client deleted, or a record saved before there was one. */
  it("returns nothing when the record has no client", () => {
    expect(clientValues(null)).toEqual({});
  });
});

describe("personName", () => {
  it("joins the three parts", () => {
    expect(personName(CLIENT)).toBe("Mario F. Rossi");
  });

  /** The middle name is optional: without it there is no double space. */
  it("skips the missing middle name", () => {
    expect(personName({ ...CLIENT, middleName: "" })).toBe("Mario Rossi");
  });
});

describe("clientLabel and clientNameOf", () => {
  it("names both company and declarant in the picker", () => {
    expect(clientLabel(CLIENT)).toBe("OO.FF. Rossi Mario — Mario F. Rossi");
  });

  /** Only the company is copied onto the record: it is what the list shows. */
  it("copies only the company onto the record", () => {
    expect(clientNameOf(CLIENT)).toBe("OO.FF. Rossi Mario");
  });
});
