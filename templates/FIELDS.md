# Schema campi template

40 campi, sintassi `{campo}` (docxtemplater). Originali intatti in `_backup/`.
Rigenerabile con `python3 scripts/normalize-templates.py` (documenti 1-5) e
`python3 scripts/placeholders-6-7.py` (allegati 2 e 3): entrambi partono da
`_backup/`.

> Gli allegati 2 e 3 (documenti 6 e 7) sono arrivati come moduli **gia'
> compilati** con i dati di una persona reale, non come template: non avevano
> nessun `[campo]` da rinominare. `placeholders-6-7.py` sostituisce i valori uno
> `<w:t>` alla volta, perche' i dati sono in grassetto e il testo fisso no, e
> Word li tiene percio' in run separati che non si possono fondere.

## Defunto — anagrafica

| Campo | Descrizione | Doc |
|---|---|---|
| `personFirstName` | Nome | 1,2,3,4,5,6,7 |
| `personLastName` | Cognome | 1,2,3,4,5,6,7 |
| `personBirthDate` | Data di nascita (gg/mm/aaaa) | 1,2,3,4,6,7 |
| `personBirthCity` | Comune di nascita | 1,4,6,7 |
| `personTaxCode` | Codice fiscale | 4,6,7 |
| `personResidenceCity` | Comune di residenza | 4,6,7 |
| `personResidenceAddress` | Via e numero di residenza | 4,6,7 |

## Defunto — decesso

| Campo | Descrizione | Doc |
|---|---|---|
| `personDeathDate` | Data del decesso (gg/mm/aaaa) | 2,3,4,5,6,7 |
| `personDeathTime` | Ora del decesso (hh:mm) | 3,4,5,6,7 |
| `personDeathCity` | Comune del decesso | 4,5,6,7 |
| `personDeathPlace` | Luogo del decesso (es. ospedale) | 4,6 |

## Trasporto

| Campo | Descrizione | Doc |
|---|---|---|
| `transportDate` | Data del trasporto | 3,4 |
| `transportTime` | Ora di partenza (hh:mm) | 3,4 |
| `transportPermitDate` | Data dell'autorizzazione al trasporto | 4 |
| `ownerVehiclePlate` | Targa dell'autofunebre scelta per il defunto | 2,3,4,7 |
| `ownerDriverName` | Nome del conducente scelto per il defunto | 4,7 |
| `funeralChurch` | Chiesa per la sosta / esequie | 4 |
| `applicantRole` | Qualita' del richiedente (es. INCARICATO) | 7 |
| `bearerNames` | Necrofori scelti per il defunto, separati da virgola | 7 |

## Destinazione

| Campo | Descrizione | Doc |
|---|---|---|
| `destinationCity` | Comune di destinazione | 1,2,3 |
| `destinationProvince` | Provincia di destinazione (sigla) | 2 |
| `destinationCemetery` | Cimitero / forno crematorio | 4,6,7 |

## Impresa funebre — dati fissi, da salvare una volta sola

> `ownerVehiclePlate` e `ownerDriverName` non sono più qui: i nomi restano
> `owner*` perché sono i placeholder dentro i `.docx`, ma i valori arrivano
> dall'autofunebre e dal conducente scelti per il singolo defunto (tabelle
> `vehicles` e `drivers`). Rinominarli in `fields.ts` senza rinominarli nei
> template lascerebbe un buco nei documenti stampati.

| Campo | Descrizione | Doc |
|---|---|---|
| `ownerFirstName` | Nome del dichiarante | 2,3,4,5,6,7 |
| `ownerMiddleName` | Secondo nome / iniziale | 2,3,4,5,6,7 |
| `ownerLastName` | Cognome del dichiarante | 2,3,4,5,6,7 |
| `ownerCompanyName` | Ragione sociale | 4,7 |
| `ownerCompanyCity` | Comune sede della ditta | 4,6,7 |
| `ownerCity` | Comune che rilascia l'autorizzazione | 3,5,6,7 |
| `ownerCityName` | Comune di partenza del trasporto | 2,6,7 |
| `ownerRequestDate` | Data di presentazione della domanda | 2 |
| `ownerBirthDate` | Data di nascita del dichiarante | 6,7 |
| `ownerBirthCity` | Comune di nascita del dichiarante | 6,7 |
| `ownerAddress` | Via e numero di residenza del dichiarante | 6,7 |
| `ownerPostalCode` | CAP del dichiarante | 6,7 |
| `ownerIdType` | Tipo di documento (es. CARTA D'IDENTITA) | 6,7 |
| `ownerIdNumber` | Numero del documento | 6,7 |
| `ownerIdIssuer` | Ente che ha rilasciato il documento | 6,7 |
| `ownerIdDate` | Data di rilascio del documento | 6,7 |

## Sistema

| Campo | Descrizione | Doc |
|---|---|---|
| `todayDate` | Data di compilazione | 1,2,3,4,5,6,7 |
| `personBirthProvince` | Sigla della provincia di nascita, ricavata dal comune | 6,7 |

---

## Correzioni applicate agli originali

**Refusi nei nomi**

| Prima | Dopo | Dove |
|---|---|---|
| `personBirthdate` | `personBirthDate` | 4 |
| `personRecidencyCity` | `personResidenceCity` | 4 |
| `personName` / `personSurname` | `personFirstName` / `personLastName` | 1 |
| `OwnerBirthCity` | `ownerCity` | 3 |
| `ownerCarTarga` | `ownerVehiclePlate` | 2,3,4 |
| `personCimiteryDestination` | `destinationCemetery` | 4 |
| `personBirthDate dd/mm/yyyy` | `personBirthDate` | 1 |

**Placeholder rotti nell'XML**

- Doc 3: `[personBirthCity;` — parentesi mai chiusa → `{destinationCity}`
- Doc 1: `[` + `personBirthCity` + `]` spezzato in tre run → ricomposto
- Doc 4: `[personBirth` + `date]`, `[personBirthCity` + `]`, `[personDeath` + `]` → ricomposti
- Doc 5: `[personDeath` + `City` + `]` → ricomposto

Word spezzava i placeholder fra più `<w:r>` perché alternava `w:lang="it-IT"` /
`"en-US"` a metà parola (correttore ortografico). Lo script unisce i run adiacenti
con la stessa formattazione prima di sostituire.

**Campi semanticamente sbagliati**

| Doc | Prima | Dopo | Perché |
|---|---|---|---|
| 5 | `deceduto ... il giorno [personBirthDate]` | `{personDeathDate}` | è la data del decesso |
| 3 | `deceduto alle ore [personDeathDate]` | `{personDeathTime}` | è un'ora |
| 4 | `[personTransportationDateTime]` | `{transportTime}` | è un'ora |
| 2 | `[OwnerBirthDate]` (data domanda) | `{ownerRequestDate}` | non è una data di nascita |
| 1,2,3 | destinazione = `[personBirthCity]` | `{destinationCity}` | la destinazione può differire dal comune di nascita |
| 2 | data fissa `San Severo 03/07/2026` | `{todayDate}` | non era un placeholder: allineata agli altri 4 |

**Nomi tenuti separati per scelta**: `ownerCity`, `ownerCityName`, `ownerCompanyCity`
si riferiscono tutti a San Severo nell'uso attuale, ma restano campi distinti.

---

## Campi ancora a penna (`___`)

Non sono placeholder: vanno compilati a mano o promossi a campi dell'app.

- **Tutti**: `Prot. n. ____/ Stato Civile`
- **Doc 4**: n. autorizzazione e Comune che l'ha rilasciata; tipo/numero/ente/data
  del documento d'identità; dati dei 2 testimoni; precauzioni igienico-sanitarie;
  sezione ricevente (nome, struttura, indirizzo, data, ora)
- **Doc 5**: Comune destinatario in testa; n. e data del decreto; 3 righe "in alternativa"
