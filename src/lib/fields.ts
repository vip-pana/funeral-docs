/**
 * Field names must match the `{field}` placeholders inside templates/*.docx.
 * Renaming one here without renaming it in the .docx silently leaves the
 * placeholder empty at generation time — the two lists are kept in sync by
 * hand. Full reference: templates/FIELDS.md
 */

export const OWNER_FIELDS = [
  "ownerFirstName",
  "ownerMiddleName",
  "ownerLastName",
  "ownerCompanyName",
  "ownerCompanyCity",
  "ownerCity",
  "ownerCityName",
  // Both keep the `owner*` name because that is the placeholder inside the
  // .docx files (the plate in 2, 3 and 4; the driver in 4), but neither value
  // comes from the company any more: they are the hearse and the driver picked
  // in the individual practice. Renaming them here without renaming them in
  // the .docx would leave a hole in the printed documents.
  // See src/app/api/practices/[id]/generate/route.ts
  "ownerVehiclePlate",
  "ownerDriverName",
  "ownerRequestDate",
] as const;

export const PRACTICE_FIELDS = [
  "personFirstName",
  "personLastName",
  "personTaxCode",
  "personBirthDate",
  "personBirthCity",
  "personResidenceCity",
  "personResidenceAddress",
  "personDeathDate",
  "personDeathTime",
  "personDeathCity",
  "personDeathPlace",
  "transportDate",
  "transportTime",
  "transportPermitDate",
  "funeralChurch",
  "destinationCity",
  "destinationProvince",
  "destinationCemetery",
] as const;

/** Computed at generation time, never stored. */
export const SYSTEM_FIELDS = ["todayDate"] as const;

export type OwnerField = (typeof OWNER_FIELDS)[number];
export type PracticeField = (typeof PRACTICE_FIELDS)[number];
export type SystemField = (typeof SYSTEM_FIELDS)[number];
export type TemplateField = OwnerField | PracticeField | SystemField;

export const ALL_FIELDS: readonly TemplateField[] = [
  ...OWNER_FIELDS,
  ...PRACTICE_FIELDS,
  ...SYSTEM_FIELDS,
];

export const FIELD_LABELS: Record<TemplateField, string> = {
  ownerFirstName: "Nome",
  ownerMiddleName: "Secondo nome",
  ownerLastName: "Cognome",
  ownerCompanyName: "Ragione sociale",
  ownerCompanyCity: "Comune sede della ditta",
  ownerCity: "Comune che rilascia l'autorizzazione",
  ownerCityName: "Comune di partenza",
  ownerVehiclePlate: "Targa autofunebre",
  ownerDriverName: "Conducente",
  ownerRequestDate: "Data della domanda",
  personFirstName: "Nome",
  personLastName: "Cognome",
  personTaxCode: "Codice fiscale",
  personBirthDate: "Data di nascita",
  personBirthCity: "Comune di nascita",
  personResidenceCity: "Comune di residenza",
  personResidenceAddress: "Indirizzo di residenza",
  personDeathDate: "Data del decesso",
  personDeathTime: "Ora del decesso",
  personDeathCity: "Comune del decesso",
  personDeathPlace: "Luogo del decesso",
  transportDate: "Data del trasporto",
  transportTime: "Ora di partenza",
  transportPermitDate: "Data autorizzazione",
  funeralChurch: "Chiesa per le esequie",
  destinationCity: "Comune di destinazione",
  destinationProvince: "Provincia",
  destinationCemetery: "Cimitero / forno crematorio",
  todayDate: "Data di compilazione",
};

/** Sections of the practice form, in the order they appear. */
export const PRACTICE_SECTIONS = [
  {
    id: "defunto",
    title: "Defunto",
    fields: [
      "personFirstName",
      "personLastName",
      "personTaxCode",
      "personBirthDate",
      "personBirthCity",
      "personResidenceCity",
      "personResidenceAddress",
    ],
  },
  {
    id: "decesso",
    title: "Decesso",
    fields: [
      "personDeathDate",
      "personDeathTime",
      "personDeathCity",
      "personDeathPlace",
    ],
  },
  {
    id: "trasporto",
    title: "Trasporto",
    fields: [
      "transportDate",
      "transportTime",
      "transportPermitDate",
      "funeralChurch",
    ],
  },
  {
    id: "destinazione",
    title: "Destinazione",
    fields: ["destinationCity", "destinationProvince", "destinationCemetery"],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  fields: readonly PracticeField[];
}[];

export const DOCUMENTS = [
  {
    id: "1",
    file: "1.docx",
    title: "Comunicazione di autorizzazione al trasporto",
    description: "Al Sindaco del comune di destinazione",
  },
  {
    id: "2",
    file: "2.docx",
    title: "Autorizzazione al trasporto in altro comune",
    description: "Rilasciata dal Sindaco",
  },
  {
    id: "3",
    file: "3.docx",
    title: "Domanda di autorizzazione al trasporto",
    description: "Richiesta della ditta al Sindaco",
  },
  {
    id: "4",
    file: "4.docx",
    title: "Modulo di chiusura feretro",
    description: "Dichiarazione dell'addetto alla chiusura",
  },
  {
    id: "5",
    file: "5.docx",
    title: "Riconoscimento di cadavere e suggellamento",
    description: "Attestazione della ditta",
  },
] as const;

export type DocumentId = (typeof DOCUMENTS)[number]["id"];
