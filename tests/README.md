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

| File | Verifica |
|---|---|
| `login.mjs` | redirect, password errata, cookie, sessione, logout |
| `interfaccia.mjs` | tema scuro, mostra password, sidebar |
| `impostazioni.mjs` | validazione, salvataggio, persistenza dei dati ditta |
| `veicoli.mjs` | elenco autofunebri, targa copiata, documenti dopo l'eliminazione |
| `conducenti.mjs` | elenco conducenti, nome copiato, documenti dopo l'eliminazione |
| `pratiche.mjs` | creazione, autocompilazione dal CF, download, contenuto dei documenti |
| `comuni.mjs` | ricerca comuni, codice catastale → comune, provincia automatica |
| `codice-fiscale.mjs` | pulsante Calcola, sesso, nessun calcolo automatico |
| `api.mjs` | casi limite della route di generazione |
| `elimina.mjs` | conferma in due passaggi |

## Nota

I test scrivono sul database configurato in `.env`: eseguirli su
`DATABASE_PATH` di produzione creerebbe schede finte fra quelle reali.
`pratiche.mjs` e `impostazioni.mjs` lasciano dietro di sé i dati che creano.
