# Test end-to-end

Guidano un browser vero contro un'istanza in esecuzione. Non sono unit test:
servono a verificare che i percorsi principali funzionino davvero, compresa la
generazione dei .docx.

> I test della logica pura (codice fiscale, validazione, documenti, comuni)
> stanno accanto al codice come `src/**/*.test.ts` e girano con `pnpm test`:
> non serve né il browser né il server.

## Come si eseguono

```bash
pnpm dev          # in un terminale
pnpm test:e2e             # in un altro
```

`BASE_URL` cambia l'indirizzo (`BASE_URL=http://localhost:3000 pnpm test:e2e`),
`TEST_PASSWORD` la password di accesso (default `sviluppo123`).

Serve Google Chrome installato: i test usano `playwright-core` con
`channel: 'chrome'`, senza scaricare un browser proprio.

## Cosa coprono

Le suite stanno passando a Playwright Test una alla volta: quelle già migrate
sono in `e2e/*.spec.ts` e girano in parallelo con `pnpm exec playwright test`,
le altre sono ancora `*.mts` e le lancia `tests/run.mts`. `pnpm test:e2e` fa
girare entrambe. Se una spec fallisce, `pnpm exec playwright show-trace` apre
la traccia salvata in `test-results/`.

| File                      | Verifica                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `e2e/login.spec.ts`       | redirect, password errata, cookie, sessione, logout                                       |
| `e2e/interfaccia.spec.ts` | tema scuro, mostra password, sidebar                                                      |
| `impostazioni.mts`        | validazione, salvataggio, persistenza dei dati ditta                                      |
| `veicoli.mts`             | elenco autofunebri, targa copiata, documenti dopo l'eliminazione                          |
| `conducenti.mts`          | spunta Conducente sul necroforo, nome copiato, documenti dopo l'eliminazione              |
| `contratto.mts`           | spunta Contratto sul necroforo, una sola voce di ferie e nessun punto nel calendario      |
| `mobile.mts`              | schermo da telefono: nessuna pagina scorre di lato, calendario per necroforo e per giorno |
| `allegati.mts`            | necrofori, allegati 2 e 3, provincia di nascita ricavata                                  |
| `pratiche.mts`            | creazione, autocompilazione dal CF, download, contenuto dei documenti                     |
| `comuni.mts`              | ricerca comuni, codice catastale → comune, provincia automatica                           |
| `codice-fiscale.mts`      | pulsante Calcola, sesso, nessun calcolo automatico                                        |
| `api.mts`                 | casi limite della route di generazione                                                    |
| `elimina.mts`             | conferma in due passaggi                                                                  |

## In CI

Il job `e2e` di `.github/workflows/ci.yml` le lancia a ogni PR su un database
nuovo, riempito con `pnpm db:seed`: le suite che creano un defunto hanno
bisogno di almeno un cliente da scegliere.

## Nota

I test scrivono sul database configurato in `.env`: eseguirli su
`DATABASE_PATH` di produzione creerebbe schede finte fra quelle reali.
`pratiche.mts` e `impostazioni.mts` lasciano dietro di sé i dati che creano.
