# Schema campi template

103 campi, sintassi `{campo}` (docxtemplater). Originali intatti in `_backup/`.
Rigenerabile con `python3 scripts/normalize-templates.py` (documenti 1-5),
`python3 scripts/placeholders-6-7.py` (allegati 2 e 3),
`python3 scripts/placeholders-8-9.py` (moduli di cremazione),
`python3 scripts/placeholders-10.py` (conferimento del mandato) e
`python3 scripts/placeholders-11.py` (istanza art. 10bis): tutti partono
da `_backup/`. `pnpm check:templates` verifica che i `.docx` e `fields.ts`
coincidano nei due sensi.

> Gli allegati 2 e 3 (documenti 6 e 7), i due moduli di cremazione (8 e 9) e
> l'istanza dell'art. 10bis (11) sono arrivati come moduli **gia' compilati** con
> i dati di una persona reale, non come template: non avevano nessun `[campo]` da
> rinominare. I tre script sostituiscono i valori uno `<w:t>` alla volta, perche'
> i dati sono in grassetto e il testo fisso no, e Word li tiene percio' in run
> separati che non si possono fondere.

> Il conferimento del mandato (documento 10) e' arrivato invece come modulo in
> bianco: ogni campo era un tratto di `____`, senza nessun dato da riconoscere.
> Lo script lo converte indirizzando i run per posizione, verificando il
> contenuto di ognuno prima di scriverlo: se Word rimescola il documento gli
> indici scivolano e lo script si ferma invece di mettere il codice fiscale
> dove va il telefono. Il documento 11 usa la stessa tecnica, pur partendo da un
> modulo compilato: i suoi valori si ripetono troppe volte per essere
> riconosciuti uno per uno.

> Il documento 11 e' l'unico che contiene un'immagine, e le sue coordinate XML
> portano dei GUID fra parentesi graffe. Il controllo `check:templates` li
> leggeva come placeholder perche' il suo regex `<w:t[^>]*>` cattura anche
> `<w:tab>` e `<w:type>`: ora il tag va chiuso esplicitamente. Stesso errore
> corretto nelle suite e2e che leggono i `.docx`.

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
| 10 | Conferimento mandato di servizio funebre |
| 11 | Istanza e rilascio di autorizzazione al trasporto di cadavere (L.R. 34/2008 art. 10bis) |

## Defunto — anagrafica

| Campo | Descrizione | Doc |
|---|---|---|
| `personFirstName` | Nome | 1,2,3,4,5,6,7,8,9,10,11 |
| `personLastName` | Cognome | 1,2,3,4,5,6,7,8,9,10,11 |
| `personBirthDate` | Data di nascita (gg/mm/aaaa) | 1,2,3,4,6,7,8,9,10,11 |
| `personBirthCity` | Comune di nascita | 1,4,6,7,8,9,10,11 |
| `personTaxCode` | Codice fiscale | 4,6,7,8,9,11 |
| `personResidenceCity` | Comune di residenza | 4,6,7,8,9,11 |
| `personResidenceAddress` | Via e numero di residenza | 4,6,7,8,9,11 |
| `personCitizenship` | Cittadinanza (default "italiana") | 9,10,11 |

## Defunto — decesso

| Campo | Descrizione | Doc |
|---|---|---|
| `personDeathDate` | Data del decesso (gg/mm/aaaa) | 2,3,4,5,6,7,8,9,10,11 |
| `personDeathTime` | Ora del decesso (hh:mm) | 3,4,5,6,7,8,9,10,11 |
| `personDeathCity` | Comune del decesso | 4,5,6,7,8,9,11 |
| `personDeathPlace` | Luogo del decesso (es. ospedale) | 4,6,10 |

## Trasporto

| Campo | Descrizione | Doc |
|---|---|---|
| `transportDate` | Data del trasporto | 3,4,10,11 |
| `transportTime` | Ora di partenza (hh:mm) | 3,4,10 |
| `transportPermitDate` | Data dell'autorizzazione al trasporto | 4 |
| `ownerVehiclePlate` | Targa dell'autofunebre scelta per il defunto | 2,3,4,7,8,9,11 |
| `ownerVehicleName` | Tipo di autofunebre (es. "Mercedes Vito") | 11 |
| `ownerDriverName` | Nome del conducente scelto per il defunto | 4,7,8,9,11 |
| `funeralChurch` | Chiesa per la sosta / esequie | 4,10,11 |
| `bearerNames` | Necrofori scelti per il defunto, separati da virgola | 7,8,9 |

## Destinazione

| Campo | Descrizione | Doc |
|---|---|---|
| `destinationCity` | Comune di destinazione | 1,2,3,11 |
| `destinationProvince` | Provincia di destinazione (sigla) | 2 |
| `destinationCemetery` | Cimitero / forno crematorio | 4,6,7,10 |

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
| `funeralStopCity` | Comune della sosta per le esequie | 8,9,11 |
| `ashesCity` | Comune nel cui cimitero vengono tumulate le ceneri | 8,9 |
| `cremationConsentRelative` | Chi ha reso la dichiarazione di volonta', preposizione inclusa (es. "dalla moglie") | 8 |
| `burialPermitDate` | Data del permesso di seppellimento | 8 |

## Mandante — solo documento 10

> Chi conferisce il mandato: di solito un familiare, ne' il defunto ne' il
> cliente-impresa. Cambia da pratica a pratica, quindi sta nella tabella
> `practices` e non in `clients`. Tutto facoltativo: chi non stampa il
> documento 10 non deve essere bloccato al salvataggio.

| Campo | Descrizione | Doc |
|---|---|---|
| `mandateFirstName` | Nome | 10 |
| `mandateLastName` | Cognome | 10 |
| `mandateRelationship` | In qualita' di (es. "figlio", "coniuge") | 10 |
| `mandateBirthDate` | Data di nascita | 10 |
| `mandateBirthCity` | Comune di nascita | 10 |
| `mandateResidenceCity` | Comune di residenza | 10 |
| `mandatePhone` | Recapito telefonico | 10 |
| `mandateTaxCode` | Codice fiscale | 10 |
| `mandateIdType` | Tipo di documento | 10 |
| `mandateIdNumber` | Numero del documento | 10 |

## Defunto — solo documento 10

| Campo | Descrizione | Doc |
|---|---|---|
| `personFatherName` | Paternita' (facoltativo) | 10 |
| `personMotherName` | Maternita' (facoltativo) | 10 |
| `personProfession` | Professione (facoltativo) | 10 |

## Stato civile e destinazione della salma — solo documento 10

> Due gruppi di caselle a scelta singola. La scelta sta in `practices` come
> `person_marital_status` e `body_destination`, ma **non e' un campo dei
> template**: il documento stampa una casella per opzione, e le otto `*Box`
> qui sotto portano "☒" o "□". Stesso trattamento di `personSex`, che alimenta
> il codice fiscale senza finire in nessun documento.
>
> Il coniuge e' chiesto sotto tre delle quattro caselle dello stato civile, con
> le stesse domande nelle stesse posizioni. La pratica lo registra **una volta
> sola** (`spouse_name`, `spouse_birth_date`, `spouse_birth_city`,
> `spouse_residence_city`), perche' una sola casella puo' essere spuntata; il
> documento invece ha un placeholder per ramo, e la generazione copia i dati
> nel ramo scelto lasciando vuoti gli altri due. Un placeholder condiviso
> stamperebbe il nome del coniuge su tutte e tre le righe, sotto caselle non
> spuntate.

| Campo | Descrizione | Doc |
|---|---|---|
| `maritalSingleBox` | Casella celibe/nubile | 10 |
| `maritalMarriedBox` | Casella coniugato/a | 10 |
| `maritalSeparatedBox` | Casella separato/a | 10 |
| `maritalWidowedBox` | Casella vedovo/a | 10 |
| `marriedSpouseName` | Coniuge, ramo "coniugato/a" | 10 |
| `marriedSpouseBirthDate` | Data di nascita del coniuge | 10 |
| `marriedSpouseBirthCity` | Comune di nascita del coniuge | 10 |
| `marriedSpouseResidenceCity` | Comune di residenza del coniuge | 10 |
| `marriageDate` | Data del matrimonio | 10 |
| `separatedSpouseName` | Coniuge, ramo "separato/a" | 10 |
| `separatedSpouseBirthDate` | Data di nascita del coniuge separato | 10 |
| `separatedSpouseBirthCity` | Comune di nascita del coniuge separato | 10 |
| `separatedSpouseResidenceCity` | Comune di residenza del coniuge separato | 10 |
| `separationDate` | Data della separazione | 10 |
| `widowedSpouseName` | Coniuge, ramo "vedovo/a" | 10 |
| `widowedSpouseDeathDate` | Data del decesso del coniuge | 10 |
| `widowedSpouseDeathCity` | Comune del decesso del coniuge | 10 |
| `destBuriedBox` | Casella inumata | 10 |
| `destEntombedBox` | Casella tumulata in tomba esistente | 10 |
| `destEntombedNewBox` | Casella tumulata in sepoltura da prenotare | 10 |
| `destCrematedBox` | Casella cremata | 10 |
| `concessionType` | Tipo di concessione (tomba esistente) | 10 |
| `concessionNumber` | Numero della concessione | 10 |
| `crematoryAra` | Ara crematoria (salma cremata) | 10 |

## Trasporto — solo documento 10

> Gli altri dati del percorso (data, ora di partenza, chiesa, cimitero) sono
> quelli che usano gia' gli altri documenti.

| Campo | Descrizione | Doc |
|---|---|---|
| `transportDeparturePlace` | Luogo di partenza del trasporto | 10 |
| `funeralStopTime` | Ora della sosta per le esequie | 10 |

## Fatturazione — solo documento 10

> A chi intestare la fattura. Spesso il mandante, non sempre: chi paga non deve
> per forza essere chi firma. Il codice fiscale accetta sia i 16 caratteri di
> una persona sia le 11 cifre di una societa'.

| Campo | Descrizione | Doc |
|---|---|---|
| `billingName` | Intestatario | 10 |
| `billingAddress` | Via | 10 |
| `billingStreetNumber` | Numero civico | 10 |
| `billingPostalCode` | CAP | 10 |
| `billingCity` | Comune | 10 |
| `billingTaxCode` | Codice fiscale | 10 |
| `billingPhone` | Recapiti telefonici | 10 |

## Dichiarante e impresa — dalla scheda del cliente

> **Il prefisso `owner` non corrisponde più a nulla nel database.** Questi campi
> arrivano dalla tabella `clients`, dove le colonne si chiamano `first_name`,
> `company_name` e così via: la corrispondenza sta tutta in `clientValues()`
> (`src/lib/clients.ts`). I nomi qui restano `owner*` perché sono i placeholder
> scritti dentro i `.docx` — rinominarli in `fields.ts` senza rinominarli nei
> template lascerebbe un buco nei documenti stampati.
>
> `ownerVehiclePlate`, `ownerVehicleName` e `ownerDriverName` non arrivano
> nemmeno dal cliente: sono l'autofunebre e il conducente scelti per il singolo
> defunto (tabelle `vehicles` e `bearers`), copiati sulla scheda al salvataggio.
> I dati del cliente invece no: vengono riletti a ogni generazione.
>
> `ownerCompanyAddress` viene dai dati di fatturazione della scheda cliente, che
> erano stati registrati perche' l'ufficio li avesse a portata di mano e non
> raggiungevano nessun documento finche' non e' arrivato l'11.

| Campo | Descrizione | Doc |
|---|---|---|
| `ownerFirstName` | Nome del dichiarante | 2,3,4,5,6,7,8,9,11 |
| `ownerMiddleName` | Secondo nome / iniziale | 2,3,4,5,6,7,8,9 |
| `ownerLastName` | Cognome del dichiarante | 2,3,4,5,6,7,8,9,11 |
| `ownerCompanyName` | Ragione sociale | 4,7,8,9,10,11 |
| `ownerCompanyCity` | Comune sede della ditta | 4,6,7,8,9,11 |
| `ownerCity` | Comune che rilascia l'autorizzazione | 3,5,6,7,8,9 |
| `ownerCityName` | Comune di partenza del trasporto | 2,6,7,8,9,10 |
| `ownerRequestDate` | Data di presentazione della domanda | 2 |
| `ownerBirthDate` | Data di nascita del dichiarante | 6,7,8,9,11 |
| `ownerBirthCity` | Comune di nascita del dichiarante | 6,7,8,9,11 |
| `ownerAddress` | Via e numero di residenza del dichiarante | 6,7,9,11 |
| `ownerPostalCode` | CAP del dichiarante | 6,7,8 |
| `ownerIdType` | Tipo di documento (es. CARTA D'IDENTITA) | 6,7,8,11 |
| `ownerIdNumber` | Numero del documento | 6,7,8,11 |
| `ownerIdIssuer` | Ente che ha rilasciato il documento | 6,7,8,11 |
| `ownerIdDate` | Data di rilascio del documento | 6,7,8,11 |
| `ownerCitizenship` | Cittadinanza del dichiarante (default "italiana") | 9 |
| `ownerCompanyAddress` | Via e numero della sede della ditta | 11 |

## Sistema — ricavati, mai salvati

> Ogni provincia e' ricavata dal comune che le sta accanto tramite il dataset
> ISTAT (`provinciaOf`), cosi' le due non possono contraddirsi. Per un comune non
> in elenco o condiviso da due province il documento stampa parentesi vuote.

| Campo | Descrizione | Doc |
|---|---|---|
| `todayDate` | Data di compilazione | 1,2,3,4,5,6,7,8,9,10,11 |
| `personBirthProvince` | Provincia di nascita del defunto | 6,7,8,9 |
| `personResidenceProvince` | Provincia di residenza del defunto | 8,9 |
| `personDeathProvince` | Provincia del decesso | 8,9 |
| `crematoryProvince` | Provincia del forno crematorio | 9 |
| `funeralStopProvince` | Provincia della sosta per le esequie | 8,9 |
| `ashesProvince` | Provincia di destinazione delle ceneri | 8,9 |
| `ownerBirthProvince` | Provincia di nascita del dichiarante | 8,9 |
| `ownerCompanyProvince` | Provincia della sede della ditta | 8,9 |
| `personAge` | Eta' del defunto, anni compiuti alla data del decesso | 10 |
| `personDeathCityUpper` | Comune del decesso in maiuscolo, per l'intestazione | 11 |

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

> Attenzione a promuoverli alla leggera. `prepareValues` scrive stringa vuota
> per ogni campo non valorizzato, quindi un `____` diventato `{campo}` e
> lasciato vuoto **non stampa piu' la riga da riempire**: sparisce. Un tratto
> va convertito solo se l'app sa davvero compilarlo.

- **Tutti**: `Prot. n. ____/ Stato Civile`
- **Doc 4**: n. autorizzazione e Comune che l'ha rilasciata; tipo/numero/ente/data
  del documento d'identità; dati dei 2 testimoni; precauzioni igienico-sanitarie;
  sezione ricevente (nome, struttura, indirizzo, data, ora)
- **Doc 5**: Comune destinatario in testa; n. e data del decreto; 3 righe "in alternativa"
- **Doc 8 e 9**: `MARCA DA BOLLO`; le righe degli allegati diverse dalla
  dichiarazione di volonta' (testamento, iscrizione ad associazione, estratto di
  morte, attestazione ASL) si barrano a mano; affidamento personale e dispersione
  delle ceneri con tutti i dati dell'affidatario; righe di firma
- **Doc 10**: il documento d'identificazione del defunto (tipo e numero) — la
  pratica registra il codice fiscale, non una carta; il piè di pagina
  dell'impresa (licenza di P.S. e data, autorizzazione amministrativa, partita
  IVA, codice fiscale); le due righe di firma
- **Doc 11**: `Prot. n.`, che scrive l'ufficio; le due righe di firma
