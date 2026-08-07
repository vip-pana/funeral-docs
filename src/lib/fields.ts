/**
 * I campi dei template .docx — unica fonte di verita'.
 *
 * I nomi corrispondono ai placeholder `{campo}` dentro templates/*.docx.
 * Cambiare un nome qui senza cambiarlo nei .docx lascia il segnaposto vuoto in
 * fase di generazione, quindi le due liste vanno tenute allineate a mano.
 * Riferimento completo: templates/FIELDS.md
 */

/** Campi della ditta: si compilano una volta sola in Impostazioni. */
export const OWNER_FIELDS = [
  "ownerFirstName",
  "ownerMiddleName",
  "ownerLastName",
  "ownerCompanyName",
  "ownerCompanyCity",
  "ownerCity",
  "ownerCityName",
  // Il nome resta `owner*` perche' e' il placeholder dentro 2.docx, 3.docx e
  // 4.docx, ma il valore non arriva piu' dalla ditta: e' la targa
  // dell'autofunebre scelta nella singola pratica. Rinominarlo qui senza
  // rinominarlo nei .docx lascerebbe un buco nei documenti stampati.
  // Vedi src/app/api/pratiche/[id]/genera/route.ts
  "ownerVehiclePlate",
  "ownerDriverName",
  "ownerRequestDate",
] as const;

/** Campi della singola pratica: si compilano per ogni defunto. */
export const PRACTICE_FIELDS = [
  // defunto — anagrafica
  "personFirstName",
  "personLastName",
  "personTaxCode",
  "personBirthDate",
  "personBirthCity",
  "personResidenceCity",
  "personResidenceAddress",
  // decesso
  "personDeathDate",
  "personDeathTime",
  "personDeathCity",
  "personDeathPlace",
  // trasporto
  "transportDate",
  "transportTime",
  "transportPermitDate",
  "funeralChurch",
  // destinazione
  "destinationCity",
  "destinationProvince",
  "destinationCemetery",
] as const;

/** Calcolato al momento della generazione, non memorizzato. */
export const SYSTEM_FIELDS = ["todayDate"] as const;

export type OwnerField = (typeof OWNER_FIELDS)[number];
export type PracticeField = (typeof PRACTICE_FIELDS)[number];
export type SystemField = (typeof SYSTEM_FIELDS)[number];
export type TemplateField = OwnerField | PracticeField | SystemField;

/** Tutti i placeholder attesi nei template. */
export const ALL_FIELDS: readonly TemplateField[] = [
  ...OWNER_FIELDS,
  ...PRACTICE_FIELDS,
  ...SYSTEM_FIELDS,
];

/** Etichette per il form, in italiano. */
export const FIELD_LABELS: Record<TemplateField, string> = {
  // ditta
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
  // defunto
  personFirstName: "Nome",
  personLastName: "Cognome",
  personTaxCode: "Codice fiscale",
  personBirthDate: "Data di nascita",
  personBirthCity: "Comune di nascita",
  personResidenceCity: "Comune di residenza",
  personResidenceAddress: "Indirizzo di residenza",
  // decesso
  personDeathDate: "Data del decesso",
  personDeathTime: "Ora del decesso",
  personDeathCity: "Comune del decesso",
  personDeathPlace: "Luogo del decesso",
  // trasporto
  transportDate: "Data del trasporto",
  transportTime: "Ora di partenza",
  transportPermitDate: "Data autorizzazione",
  funeralChurch: "Chiesa per le esequie",
  // destinazione
  destinationCity: "Comune di destinazione",
  destinationProvince: "Provincia",
  destinationCemetery: "Cimitero / forno crematorio",
  // sistema
  todayDate: "Data di compilazione",
};

/** Sezioni del form pratica, nell'ordine in cui compaiono. */
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

/** I 5 documenti generabili e i campi che ciascuno consuma. */
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
