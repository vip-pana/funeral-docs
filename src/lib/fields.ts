/**
 * Field names must match the `{field}` placeholders inside templates/*.docx.
 * Renaming one here without renaming it in the .docx silently leaves the
 * placeholder empty at generation time — the two lists are kept in sync by
 * hand. Full reference: templates/FIELDS.md
 */

/**
 * The `owner` prefix no longer matches anything in the database: these are the
 * placeholders written inside the .docx, and they are filled from the `clients`
 * table, whose columns drop the prefix. `clientValues` in src/lib/clients.ts is
 * the only place the two are mapped onto each other.
 */
export const OWNER_FIELDS = [
  "ownerFirstName",
  "ownerMiddleName",
  "ownerLastName",
  "ownerCompanyName",
  "ownerCompanyCity",
  "ownerCity",
  "ownerCityName",
  // These two do not even come from the client: they are the hearse and the
  // driver picked in the individual practice, and are copied onto it at save
  // time. See src/app/api/deceased/[id]/generate/route.ts
  "ownerVehiclePlate",
  "ownerDriverName",
  "ownerRequestDate",
  // Identify the declarant in full, as attachments 2 and 3 of L.R. 34/2008
  // require (documents 6 and 7). The older documents do not use them.
  "ownerBirthDate",
  "ownerBirthCity",
  "ownerAddress",
  "ownerPostalCode",
  "ownerIdType",
  "ownerIdNumber",
  "ownerIdIssuer",
  "ownerIdDate",
  // Document 9 only, which states the citizenship of the declarant.
  "ownerCitizenship",
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
  // Documents 6 and 7 only.
  "applicantRole",
  "bearerNames",
  // Cremation, documents 8 and 9.
  "crematoryCity",
  "funeralStopCity",
  "ashesCity",
  "cremationConsentRelative",
  "burialPermitDate",
  "personCitizenship",
] as const;

/**
 * Computed at generation time, never stored. Every province is derived from the
 * municipality beside it through the ISTAT dataset, so there is no field to fill
 * in and no way for the two to disagree. `provinciaOf` gives nothing back for a
 * name that is not in the list or shared by two provinces, and the documents
 * then print an empty pair of brackets.
 */
export const SYSTEM_FIELDS = [
  "todayDate",
  "personBirthProvince",
  "personResidenceProvince",
  "personDeathProvince",
  // Documents 8 and 9 print the province beside almost every municipality.
  "crematoryProvince",
  "funeralStopProvince",
  "ashesProvince",
  "ownerBirthProvince",
  "ownerCompanyProvince",
] as const;

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
  ownerBirthDate: "Data di nascita",
  ownerBirthCity: "Comune di nascita",
  ownerAddress: "Indirizzo di residenza",
  ownerPostalCode: "CAP",
  ownerIdType: "Tipo di documento",
  ownerIdNumber: "Numero del documento",
  ownerIdIssuer: "Rilasciato da",
  ownerIdDate: "Data di rilascio",
  ownerCitizenship: "Cittadinanza",
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
  applicantRole: "Qualità del richiedente",
  bearerNames: "Necrofori",
  crematoryCity: "Comune del forno crematorio",
  funeralStopCity: "Comune della sosta per le esequie",
  ashesCity: "Comune di destinazione delle ceneri",
  cremationConsentRelative: "Dichiarazione di volontà resa",
  burialPermitDate: "Data del permesso di seppellimento",
  personCitizenship: "Cittadinanza",
  todayDate: "Data di compilazione",
  personBirthProvince: "Provincia di nascita",
  personResidenceProvince: "Provincia di residenza",
  personDeathProvince: "Provincia del decesso",
  crematoryProvince: "Provincia del forno crematorio",
  funeralStopProvince: "Provincia della sosta",
  ashesProvince: "Provincia di destinazione delle ceneri",
  ownerBirthProvince: "Provincia di nascita del dichiarante",
  ownerCompanyProvince: "Provincia della sede della ditta",
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
      "personCitizenship",
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
  {
    id: "cremazione",
    title: "Cremazione",
    fields: [
      "crematoryCity",
      "funeralStopCity",
      "ashesCity",
      "cremationConsentRelative",
      "burialPermitDate",
    ],
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
  {
    id: "6",
    file: "6.docx",
    title: "Allegato 2 — Richiesta di autorizzazione al trasporto",
    description: "L.R. 34/2008, presentata dal richiedente",
  },
  {
    id: "7",
    file: "7.docx",
    title: "Allegato 3 — Autorizzazione al trasporto",
    description: "L.R. 34/2008, rilasciata dal Comune",
  },
  {
    id: "8",
    file: "8.docx",
    title: "Richiesta di trasporto e cremazione",
    description: "L.R. 34/2008 art. 12-13, presentata dalla ditta",
  },
  {
    id: "9",
    file: "9.docx",
    title: "Autorizzazione al trasporto e cremazione",
    description: "L.R. 34/2008 art. 12-13, rilasciata dal Comune",
  },
] as const;

export type DocumentId = (typeof DOCUMENTS)[number]["id"];
