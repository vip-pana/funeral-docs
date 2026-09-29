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
pnpm test:e2e     # in un altro
```

`BASE_URL` cambia l'indirizzo (`BASE_URL=http://localhost:3000 pnpm test:e2e`),
`TEST_PASSWORD` la password di accesso (default `sviluppo123`).

Girano con Playwright Test, in parallelo. Serve Google Chrome installato: la
configurazione usa `channel: "chrome"`, senza scaricare un browser proprio.

- Un solo file: `pnpm test:e2e tests/e2e/clienti.spec.ts`.
- Col browser visibile, passo per passo: `pnpm test:e2e --ui`.
- Se un test fallisce, la traccia (DOM, rete, screenshot di ogni passo) resta
  in `test-results/`: `pnpm exec playwright show-trace <file>.zip`.

## Come sono scritti

- **Indipendenti.** Ogni test si crea i dati che gli servono (un'autofunebre,
  un necroforo, una scheda) con nomi unici (`unique()`, `uniquePlate()` in
  `e2e/helpers.ts`) e li elimina alla fine. Nessun test conta su quello che ne
  ha lasciato un altro: per questo possono girare in parallelo.
- **Un solo login.** Il progetto `login` (`e2e/auth.setup.ts`) entra una volta
  e salva la sessione; tutti gli altri partono da lì. Chi deve partire da
  sloggato usa `LOGGED_OUT`.
- **Impostazioni per ultima.** Cambia la password con cui entrano tutti, quindi
  sta in un progetto a parte (`password`) che parte solo quando gli altri
  hanno finito, un test alla volta. Se un altro test fallisce, questi non
  girano.
- **Nessuna attesa fissa.** Si aspetta con `expect(...)`, che riprova finché la
  condizione è vera o scade il tempo.

## Cosa coprono

| File                         | Verifica                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `e2e/login.spec.ts`          | redirect, password errata, cookie, sessione, logout                                       |
| `e2e/interfaccia.spec.ts`    | tema scuro, mostra password, sidebar                                                      |
| `e2e/risorse.spec.ts`        | autofunebri e necrofori, form che non si svuotano dopo un errore, navigazione             |
| `e2e/clienti.spec.ts`        | validazione, creazione, modifica, scelta su un defunto, eliminazione                      |
| `e2e/veicoli.spec.ts`        | autofunebri, targa copiata sulla scheda, documenti dopo l'eliminazione                    |
| `e2e/conducenti.spec.ts`     | spunta Conducente sul necroforo, nome copiato, documenti dopo l'eliminazione              |
| `e2e/contratto.spec.ts`      | spunta Contratto sul necroforo, una sola voce di ferie e nessun punto nel calendario      |
| `e2e/mobile.spec.ts`         | schermo da telefono: nessuna pagina scorre di lato, calendario per necroforo e per giorno |
| `e2e/allegati.spec.ts`       | necrofori, allegati 2 e 3, provincia di nascita ricavata                                  |
| `e2e/pratiche.spec.ts`       | creazione, download, contenuto dei documenti, modifica, validazione                       |
| `e2e/comuni.spec.ts`         | ricerca comuni, codice catastale → comune, autocompilazione dal CF, provincia automatica  |
| `e2e/codice-fiscale.spec.ts` | pulsante Calcola, sesso, nessun calcolo automatico                                        |
| `e2e/api.spec.ts`            | casi limite della route di generazione                                                    |
| `e2e/elimina.spec.ts`        | conferma in due passaggi                                                                  |
| `e2e/impostazioni.spec.ts`   | cambio password: validazione, la vecchia non entra più, ripristino                        |

## In CI

Il job `e2e` di `.github/workflows/ci.yml` le lancia a ogni PR su un database
nuovo, riempito con `pnpm db:seed`: i test che creano un defunto hanno bisogno
del cliente di esempio. Playwright avvia da solo la build di produzione
(`webServer` in `playwright.config.ts`). Se qualcosa fallisce, il report con le
tracce è scaricabile come artifact `playwright-report`.

## Nota

I test scrivono sul database dell'istanza a cui puntano: eseguirli contro
quella di produzione creerebbe schede finte fra quelle reali. Puliscono dietro
di sé, ma un test che fallisce a metà lascia i suoi dati.
