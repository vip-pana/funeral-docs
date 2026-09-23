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
  // These three do not even come from the client: they are the hearse and the
  // driver picked in the individual practice, and are copied onto it at save
  // time. See src/app/api/deceased/[id]/generate/route.ts
  "ownerVehiclePlate",
  /** Make and model of the hearse, e.g. "Mercedes Vito". Document 11. */
  "ownerVehicleName",
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
  /**
   * Street and number of the firm's registered office, which document 11 names
   * beside the municipality. It comes from the billing details on the client
   * card: those were recorded for the office to have at hand and reached no
   * document until this one.
   */
  "ownerCompanyAddress",
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
  "bearerNames",
  // Cremation, documents 8 and 9.
  "crematoryCity",
  "funeralStopCity",
  "ashesCity",
  "cremationConsentRelative",
  "burialPermitDate",
  "personCitizenship",

  // Document 10 only, the mandate the family signs. Whoever confers it is
  // neither the deceased nor the client company: usually a relative, and a
  // different one for every practice, so they live here rather than in
  // `clients`.
  "mandateFirstName",
  "mandateLastName",
  "mandateBirthDate",
  "mandateBirthCity",
  "mandateResidenceCity",
  "mandatePhone",
  "mandateTaxCode",
  "mandateIdType",
  "mandateIdNumber",
  /** In what capacity the mandate is given, e.g. "figlio", "coniuge". */
  "mandateRelationship",

  // The deceased, as document 10 alone asks for them. Optional by design.
  "personFatherName",
  "personMotherName",
  "personProfession",
  /**
   * The deceased's identity document. The practice records their tax code, not
   * a card, so these two exist only because document 10 asks for them by name.
   */
  "personIdType",
  "personIdNumber",

  /**
   * The spouse, under whichever of the three branches is ticked. Married,
   * legally separated and widowed ask for the same details in the same
   * positions, and only one can be chosen, so the practice stores one group
   * rather than three that would always be empty. The document has a separate
   * placeholder per branch — see the `*Spouse*` system fields — because the two
   * branches that were not ticked have to print blank.
   *
   * None of the stored spouse columns appears here: nothing in any template is
   * called `spouseName` or `marriageDate`. They are what the system fields are
   * computed from, like `personMaritalStatus`.
   */

  // Transport, as document 10 details it. The date, the departure time, the
  // church and the cemetery are the ones the other documents already use.
  "transportDeparturePlace",
  "funeralStopTime",

  "concessionType",
  "concessionNumber",
  /** The crematorium's furnace, when the body is cremated first. */
  "crematoryAra",

  // No invoice block: document 10 asks who to make the invoice out to, but in
  // practice nobody ever filled it in, so those two lines go back to being
  // completed by hand like the rest of the form's footer.
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

  /**
   * Document 10 prints the age of the deceased. Derived from the two dates
   * rather than typed, so it cannot contradict them.
   */
  "personAge",

  /**
   * The municipality of death in capitals, for the heading of the second half
   * of document 11 ("COMUNE DI X SERVIZI DEMOGRAFICI"), which is set that way.
   * Uppercased here rather than stored twice, so the two can never disagree.
   */
  "personDeathCityUpper",

  /**
   * The tick boxes of document 10, one per option of its two exclusive groups.
   * Each carries "☒" or "□" and is expanded from `personMaritalStatus` and
   * `bodyDestination` when the document is filled. They are fields, not form
   * inputs: the form asks for the choice, not for eight glyphs.
   */
  "maritalSingleBox",
  "maritalMarriedBox",
  "maritalSeparatedBox",
  "maritalWidowedBox",
  "destBuriedBox",
  "destEntombedBox",
  "destEntombedNewBox",
  "destCrematedBox",

  /**
   * The spouse, once per branch of the marital status. The practice stores a
   * single set of details — only one branch can be true — but the document
   * repeats the same questions under each box, and the two branches that were
   * not ticked have to come out blank. So the details are copied into the
   * chosen branch's fields at generation time and the others are left empty:
   * one shared placeholder would print the spouse's name on all three lines,
   * under boxes that carry no tick.
   */
  "marriedSpouseName",
  "marriedSpouseBirthDate",
  "marriedSpouseBirthCity",
  "marriedSpouseResidenceCity",
  "marriageDate",
  "separatedSpouseName",
  "separatedSpouseBirthDate",
  "separatedSpouseBirthCity",
  "separatedSpouseResidenceCity",
  "separationDate",
  "widowedSpouseName",
  "widowedSpouseDeathDate",
  "widowedSpouseDeathCity",
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
  ownerVehicleName: "Tipo di autofunebre",
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
  ownerCompanyAddress: "Indirizzo della sede",
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
  mandateFirstName: "Nome",
  mandateLastName: "Cognome",
  mandateBirthDate: "Data di nascita",
  mandateBirthCity: "Comune di nascita",
  mandateResidenceCity: "Comune di residenza",
  mandatePhone: "Recapito telefonico",
  mandateTaxCode: "Codice fiscale",
  mandateIdType: "Tipo di documento",
  mandateIdNumber: "Numero del documento",
  mandateRelationship: "In qualità di",
  personFatherName: "Paternità",
  personMotherName: "Maternità",
  personProfession: "Professione",
  personIdType: "Tipo di documento",
  personIdNumber: "Numero del documento",
  transportDeparturePlace: "Luogo di partenza",
  funeralStopTime: "Ora della sosta",
  concessionType: "Tipo di concessione",
  concessionNumber: "Numero della concessione",
  crematoryAra: "Ara crematoria",
  personAge: "Età del defunto",
  personDeathCityUpper: "Comune del decesso in maiuscolo",
  maritalSingleBox: "Casella celibe/nubile",
  maritalMarriedBox: "Casella coniugato/a",
  maritalSeparatedBox: "Casella separato/a",
  maritalWidowedBox: "Casella vedovo/a",
  destBuriedBox: "Casella inumata",
  destEntombedBox: "Casella tumulata in tomba esistente",
  destEntombedNewBox: "Casella tumulata in sepoltura da prenotare",
  destCrematedBox: "Casella cremata",
  marriedSpouseName: "Nome del coniuge",
  marriedSpouseBirthDate: "Data di nascita del coniuge",
  marriedSpouseBirthCity: "Comune di nascita del coniuge",
  marriedSpouseResidenceCity: "Comune di residenza del coniuge",
  marriageDate: "Data del matrimonio",
  separatedSpouseName: "Nome del coniuge separato",
  separatedSpouseBirthDate: "Data di nascita del coniuge separato",
  separatedSpouseBirthCity: "Comune di nascita del coniuge separato",
  separatedSpouseResidenceCity: "Comune di residenza del coniuge separato",
  separationDate: "Data della separazione",
  widowedSpouseName: "Nome del coniuge defunto",
  widowedSpouseDeathDate: "Data del decesso del coniuge",
  widowedSpouseDeathCity: "Comune del decesso del coniuge",
};

/** Sections of the practice form, in the order they appear. */
export const PRACTICE_SECTIONS = [
  {
    id: "mandante",
    title: "Mandante",
    fields: [
      "mandateFirstName",
      "mandateLastName",
      "mandateRelationship",
      "mandateBirthDate",
      "mandateBirthCity",
      "mandateResidenceCity",
      "mandatePhone",
      "mandateTaxCode",
      "mandateIdType",
      "mandateIdNumber",
    ],
  },
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
      // Document 10 alone asks for these, and states they are optional.
      "personFatherName",
      "personMotherName",
      "personProfession",
      "personIdType",
      "personIdNumber",
    ],
  },
  // There is no "Stato civile" section: the card exists in the form, but none
  // of what it asks for is a template field. The choice and the spouse's
  // details are columns the `*Box` and `*Spouse*` system fields are computed
  // from, the same way `personSex` feeds the tax code without ever being
  // printed.
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
      // Document 10 details the route: where the hearse leaves from and at what
      // time it stops for the service.
      "transportDeparturePlace",
      "funeralStopTime",
    ],
  },
  {
    id: "destinazione",
    title: "Destinazione",
    fields: [
      "destinationCity",
      "destinationProvince",
      "destinationCemetery",
      // What becomes of the body, document 10. The choice itself
      // (`bodyDestination`) is not a field, for the reason given above the
      // marital status section: it prints as tick boxes.
      "concessionType",
      "concessionNumber",
      "crematoryAra",
    ],
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
    title: "B4 Autorizzazione al trasporto in altro comune",
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
    title: "B5 Modulo di chiusura feretro",
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
    title: "B7 Richiesta di trasporto e cremazione",
    description: "L.R. 34/2008 art. 12-13, presentata dalla ditta",
  },
  {
    id: "9",
    file: "9.docx",
    title: "B6 Autorizzazione al trasporto e cremazione",
    description: "L.R. 34/2008 art. 12-13, rilasciata dal Comune",
  },
  {
    id: "10",
    file: "10.docx",
    title: "Conferimento mandato di servizio funebre",
    description: "Delega della famiglia all'impresa",
  },
  {
    id: "11",
    file: "11.docx",
    title: "Istanza e autorizzazione al trasporto di cadavere",
    description: "L.R. 34/2008 art. 10bis comma 1, richiesta e rilascio",
  },
] as const;

export type DocumentId = (typeof DOCUMENTS)[number]["id"];
