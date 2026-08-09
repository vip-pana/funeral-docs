# Schema campi template

54 campi, sintassi `{campo}` (docxtemplater). Originali intatti in `_backup/`.
Rigenerabile con `python3 scripts/normalize-templates.py` (documenti 1-5),
`python3 scripts/placeholders-6-7.py` (allegati 2 e 3) e
`python3 scripts/placeholders-8-9.py` (moduli di cremazione): tutti partono da
`_backup/`. `pnpm check:templates` verifica che i `.docx` e `fields.ts`
coincidano nei due sensi.

> Gli allegati 2 e 3 (documenti 6 e 7) e i due moduli di cremazione (8 e 9) sono
> arrivati come moduli **gia' compilati** con i dati di una persona reale, non
> come template: non avevano nessun `[campo]` da rinominare. I due script
> sostituiscono i valori uno `<w:t>` alla volta, perche' i dati sono in grassetto
> e il testo fisso no, e Word li tiene percio' in run separati che non si possono
> fondere.

## I documenti

| Doc | Modulo |
|---|---|
| 1 | Comunicazione di autorizzazione al trasporto |
| 2 | B4 Autorizzazione al trasporto in altro comune |
| 3 | Domanda di autorizzazione al trasporto |
| 4 | B5 Modulo di chiusura feretro |
| 5 | Riconoscimento di cadavere e suggellamento |
| 6 | Allegato 2 — Richiesta di autorizzazione al trasporto (L.R. 34/2008) |
| 7 | Allegato 3 — Autorizzazione al trasporto (L.R. 34/2008) |
| 8 | B7 Richiesta di trasporto e cremazione (L.R. 34/2008 art. 12-13) |
| 9 | B6 Autorizzazione al trasporto e cremazione (L.R. 34/2008 art. 12-13) |

## Defunto — anagrafica

| Campo | Descrizione | Doc |
|---|---|---|
| `personFirstName` | Nome | 1,2,3,4,5,6,7,8,9 |
| `personLastName` | Cognome | 1,2,3,4,5,6,7,8,9 |
| `personBirthDate` | Data di nascita (gg/mm/aaaa) | 1,2,3,4,6,7,8,9 |
| `personBirthCity` | Comune di nascita | 1,4,6,7,8,9 |
| `personTaxCode` | Codice fiscale | 4,6,7,8,9 |
| `personResidenceCity` | Comune di residenza | 4,6,7,8,9 |
| `personResidenceAddress` | Via e numero di residenza | 4,6,7,8,9 |
| `personCitizenship` | Cittadinanza (default "italiana") | 9 |

## Defunto — decesso

| Campo | Descrizione | Doc |
|---|---|---|
| `personDeathDate` | Data del decesso (gg/mm/aaaa) | 2,3,4,5,6,7,8,9 |
| `personDeathTime` | Ora del decesso (hh:mm) | 3,4,5,6,7,8,9 |
| `personDeathCity` | Comune del decesso | 4,5,6,7,8,9 |
| `personDeathPlace` | Luogo del decesso (es. ospedale) | 4,6 |

## Trasporto

| Campo | Descrizione | Doc |
|---|---|---|
| `transportDate` | Data del trasporto | 3,4 |
| `transportTime` | Ora di partenza (hh:mm) | 3,4 |
| `transportPermitDate` | Data dell'autorizzazione al trasporto | 4 |
| `ownerVehiclePlate` | Targa dell'autofunebre scelta per il defunto | 2,3,4,7,8,9 |
| `ownerDriverName` | Nome del conducente scelto per il defunto | 4,7,8,9 |
| `funeralChurch` | Chiesa per la sosta / esequie | 4 |
| `bearerNames` | Necrofori scelti per il defunto, separati da virgola | 7,8,9 |

## Destinazione

| Campo | Descrizione | Doc |
|---|---|---|
| `destinationCity` | Comune di destinazione | 1,2,3 |
| `destinationProvince` | Provincia di destinazione (sigla) | 2 |
| `destinationCemetery` | Cimitero / forno crematorio | 4,6,7 |

## Cremazione — solo documenti 8 e 9

> I due moduli distinguono tre comuni che `destination*` da solo non esprime: il
> forno crematorio, la sosta per le esequie e il comune dove finiscono le ceneri.
> Tutti facoltativi: una tumulazione lascia la scheda vuota.
>
> Delle tre alternative per le ceneri viene compilato solo **il seppellimento**.
> Affidamento personale e dispersione restano righe con `____` da barrare e
> riempire a mano, come `Prot. n. ____`.

| Campo | Descrizione | Doc |
|---|---|---|
| `crematoryCity` | Comune del forno crematorio | 8,9 |
| `funeralStopCity` | Comune della sosta per le esequie | 8,9 |
| `ashesCity` | Comune nel cui cimitero vengono tumulate le ceneri | 8,9 |
| `cremationConsentRelative` | Chi ha reso la dichiarazione di volonta', preposizione inclusa (es. "dalla moglie") | 8 |
| `burialPermitDate` | Data del permesso di seppellimento | 8 |

## Dichiarante e impresa — dalla scheda del cliente

> **Il prefisso `owner` non corrisponde più a nulla nel database.** Questi campi
> arrivano dalla tabella `clients`, dove le colonne si chiamano `first_name`,
> `company_name` e così via: la corrispondenza sta tutta in `clientValues()`
> (`src/lib/clients.ts`). I nomi qui restano `owner*` perché sono i placeholder
> scritti dentro i `.docx` — rinominarli in `fields.ts` senza rinominarli nei
> template lascerebbe un buco nei documenti stampati.
>
> `ownerVehiclePlate` e `ownerDriverName` non arrivano nemmeno dal cliente: sono
> l'autofunebre e il conducente scelti per il singolo defunto (tabelle
> `vehicles` e `bearers`), copiati sulla scheda al salvataggio. I dati del
> cliente invece no: vengono riletti a ogni generazione.

| Campo | Descrizione | Doc |
|---|---|---|
| `ownerFirstName` | Nome del dichiarante | 2,3,4,5,6,7,8,9 |
| `ownerMiddleName` | Secondo nome / iniziale | 2,3,4,5,6,7,8,9 |
| `ownerLastName` | Cognome del dichiarante | 2,3,4,5,6,7,8,9 |
| `ownerCompanyName` | Ragione sociale | 4,7,8,9 |
| `ownerCompanyCity` | Comune sede della ditta | 4,6,7,8,9 |
| `ownerCity` | Comune che rilascia l'autorizzazione | 3,5,6,7,8,9 |
| `ownerCityName` | Comune di partenza del trasporto | 2,6,7,8,9 |
| `ownerRequestDate` | Data di presentazione della domanda | 2 |
| `ownerBirthDate` | Data di nascita del dichiarante | 6,7,8,9 |
| `ownerBirthCity` | Comune di nascita del dichiarante | 6,7,8,9 |
| `ownerAddress` | Via e numero di residenza del dichiarante | 6,7,9 |
| `ownerPostalCode` | CAP del dichiarante | 6,7,8 |
| `ownerIdType` | Tipo di documento (es. CARTA D'IDENTITA) | 6,7,8 |
| `ownerIdNumber` | Numero del documento | 6,7,8 |
| `ownerIdIssuer` | Ente che ha rilasciato il documento | 6,7,8 |
| `ownerIdDate` | Data di rilascio del documento | 6,7,8 |
| `ownerCitizenship` | Cittadinanza del dichiarante (default "italiana") | 9 |

## Sistema — ricavati, mai salvati

> Ogni provincia e' ricavata dal comune che le sta accanto tramite il dataset
> ISTAT (`provinciaOf`), cosi' le due non possono contraddirsi. Per un comune non
> in elenco o condiviso da due province il documento stampa parentesi vuote.

| Campo | Descrizione | Doc |
|---|---|---|
| `todayDate` | Data di compilazione | 1,2,3,4,5,6,7,8,9 |
| `personBirthProvince` | Provincia di nascita del defunto | 6,7,8,9 |
| `personResidenceProvince` | Provincia di residenza del defunto | 8,9 |
| `personDeathProvince` | Provincia del decesso | 8,9 |
| `crematoryProvince` | Provincia del forno crematorio | 9 |
| `funeralStopProvince` | Provincia della sosta per le esequie | 8,9 |
| `ashesProvince` | Provincia di destinazione delle ceneri | 8,9 |
| `ownerBirthProvince` | Provincia di nascita del dichiarante | 8,9 |
| `ownerCompanyProvince` | Provincia della sede della ditta | 8,9 |

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
- **Doc 8 e 9**: `MARCA DA BOLLO`; le righe degli allegati diverse dalla
  dichiarazione di volonta' (testamento, iscrizione ad associazione, estratto di
  morte, attestazione ASL) si barrano a mano; affidamento personale e dispersione
  delle ceneri con tutti i dati dell'affidatario; righe di firma
