import { describe, expect, it } from "vitest";

import type { Owner } from "./db/schema";
import { ownerValues } from "./owner";

/**
 * Only `ownerValues` is tested here: `getOwner` reads the database and is
 * covered end-to-end by tests/impostazioni.mjs.
 */

const OWNER: Owner = {
  id: 1,
  ownerFirstName: "Mario",
  ownerMiddleName: "F.",
  ownerLastName: "Rossi",
  ownerCompanyName: "OO.FF. Rossi Mario",
  ownerCompanyCity: "San Severo",
  ownerCity: "San Severo",
  ownerCityName: "San Severo",
  ownerBirthDate: "1980-03-15",
  ownerBirthCity: "San Severo",
  ownerAddress: "Via Giuseppe Verdi 12",
  ownerPostalCode: "71016",
  ownerIdType: "CARTA D'IDENTITA",
  ownerIdNumber: "AA1234567",
  ownerIdIssuer: "COMUNE DI SAN SEVERO",
  ownerIdDate: "2020-06-10",
  ownerCitizenship: "italiana",
  updatedAt: "2026-08-07 10:00:00",
};

describe("ownerValues", () => {
  it("returns the company fields the templates expect", () => {
    expect(ownerValues(OWNER)).toEqual({
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
    const values = ownerValues(OWNER);
    expect(values).not.toHaveProperty("ownerVehiclePlate");
    expect(values).not.toHaveProperty("ownerDriverName");
    expect(values).not.toHaveProperty("ownerRequestDate");
  });

  it("leaves out the database bookkeeping", () => {
    const values = ownerValues(OWNER);
    expect(values).not.toHaveProperty("id");
    expect(values).not.toHaveProperty("updatedAt");
  });

  /** Settings never saved: the documents come out without the company data. */
  it("returns nothing when there is no configuration", () => {
    expect(ownerValues(null)).toEqual({});
  });
});
