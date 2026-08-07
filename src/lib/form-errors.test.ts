import { describe, expect, it } from "vitest";

import { collectErrors } from "./form-errors";

describe("collectErrors", () => {
  it("flattens the issues into one message per field", () => {
    expect(
      collectErrors([
        { path: ["personFirstName"], message: "Nome: campo obbligatorio" },
        { path: ["destinationProvince"], message: "Sigla provincia: 2 lettere" },
      ]),
    ).toEqual({
      personFirstName: "Nome: campo obbligatorio",
      destinationProvince: "Sigla provincia: 2 lettere",
    });
  });

  /** The form has room for a single message under each input. */
  it("keeps the first message when a field fails twice", () => {
    expect(
      collectErrors([
        { path: ["personTaxCode"], message: "primo" },
        { path: ["personTaxCode"], message: "secondo" },
      ]),
    ).toEqual({ personTaxCode: "primo" });
  });

  it("renames a field so the message lands on the input that exists", () => {
    // The driver form posts as `driverName` while the column is `name`.
    expect(
      collectErrors([{ path: ["name"], message: "Nome: campo obbligatorio" }], {
        name: "driverName",
      }),
    ).toEqual({ driverName: "Nome: campo obbligatorio" });
  });

  it("leaves fields that are not renamed alone", () => {
    expect(
      collectErrors(
        [
          { path: ["name"], message: "sul nome" },
          { path: ["plate"], message: "sulla targa" },
        ],
        { name: "driverName" },
      ),
    ).toEqual({ driverName: "sul nome", plate: "sulla targa" });
  });

  it("returns nothing when there are no issues", () => {
    expect(collectErrors([])).toEqual({});
  });
});
