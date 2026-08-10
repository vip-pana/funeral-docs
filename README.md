# Documenti funebri

Compilazione e stampa dei documenti per il trasporto funebre. Inserisci i dati
del defunto una volta, scarichi i cinque moduli già riempiti.

I modelli sono i `.docx` reali del Comune di San Severo: il layout resta
identico, l'app riempie solo i campi.

## Avvio in Docker (locale)

```bash
cp .env.example .env
pnpm auth:hash 'la-tua-password'      # incolla la riga stampata nel .env
openssl rand -base64 32                # e questa come SESSION_SECRET

mkdir -p data
docker compose -f docker-compose.prod.yml up -d --build
```

L'app risponde su <http://localhost:3000>.

```bash
docker compose -f docker-compose.prod.yml logs -f    # seguire i log
docker compose -f docker-compose.prod.yml down       # fermare
```

Il database sta in `./data/funeral.db` sull'host: sopravvive a riavvii e
ricostruzioni dell'immagine. Per spostarlo altrove, `FUNERAL_DATA_DIR`.

L'avvio si interrompe con un messaggio esplicito se manca `SESSION_SECRET`, se
l'hash della password è malformato, se il volume dei dati non è montato o se i
template non ci sono: meglio non partire che partire su un archivio vuoto.

## Sviluppo senza Docker

```bash
pnpm install
pnpm db:migrate
pnpm db:seed     # facoltativo: dati di esempio con cui vedere l'app piena
pnpm dev
```

## Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` | server di sviluppo |
| `pnpm build` | build di produzione |
| `pnpm auth:hash '<password>'` | genera l'hash per `AUTH_PASSWORD_HASH` (solo la prima) |
| `pnpm db:generate` | crea una migrazione dallo schema |
| `pnpm db:migrate` | applica le migrazioni |
| `pnpm db:seed` | dati di esempio; `--reset` rifà le schede da zero |
| `pnpm check:templates` | verifica che i `.docx` e `fields.ts` coincidano |
| `pnpm test` | test unitari della logica pura |
| `pnpm test:e2e` | suite end-to-end (serve un'istanza in ascolto) |

## Come è fatto

Next.js 16 · React 19 · Tailwind 4 · shadcn/ui · SQLite con Drizzle ·
docxtemplater.

| Percorso | Contenuto |
|---|---|
| `templates/` | i sette `.docx`, con i placeholder `{campo}` |
| `templates/FIELDS.md` | i 40 campi e le correzioni fatte ai modelli |
| `src/lib/fields.ts` | definizione dei campi — unica fonte di verità |
| `src/lib/docs/render.ts` | riempimento dei documenti |
| `src/lib/comuni.ts` | 7.904 comuni ISTAT per l'autocompletamento |
| `scripts/normalize-templates.py` | normalizza i placeholder nei documenti 1-5 |
| `scripts/placeholders-6-7.py` | trasforma in template gli allegati 2 e 3 |
| `tests/` | suite end-to-end su browser |

Dichiarante e impresa stanno nella scheda di un **cliente**: si registrano una
volta in **Clienti** e per ogni defunto si sceglie per conto di chi vengono
emessi i documenti. È l'unico campo obbligatorio oltre ai dati del defunto —
senza, i documenti uscirebbero senza intestazione. Il codice fiscale compila da
solo data e comune di nascita.

A differenza della targa e del conducente, i dati del cliente non vengono
copiati sulla scheda: i documenti li rileggono al momento della generazione,
così correggere un indirizzo sistema tutto ciò che viene ristampato dopo.

**Autofunebri**, **conducenti** e **necrofori** si elencano in **Risorse** ma
si scelgono per singolo defunto: targa e nomi vengono copiati sulla scheda al
salvataggio, così i documenti già emessi restano corretti anche se una voce
viene poi eliminata dall'elenco.

**Impostazioni** contiene solo il cambio della password. È una sola, condivisa:
la prima si imposta con `pnpm auth:hash` nel `.env`, poi finisce nel database e
si cambia da lì — modificare il `.env` non ha più effetto.

Gli **allegati 2 e 3** (documenti 6 e 7) della L.R. 34/2008 identificano per
esteso il dichiarante: il suo documento d'identità e la residenza stanno nella
scheda del cliente, mentre i necrofori si scelgono per ogni defunto. La qualità
con cui presenta la domanda è fissa nel modello. La provincia di nascita non è un campo:
viene ricavata dal comune tramite il dataset ISTAT.

## Deploy sul server

In produzione su **Victus**: <https://funeral-docs.tail134f9a.ts.net>, raggiungibile
solo da dentro la tailnet.

L'app ha un nodo Tailscale suo (un sidecar nel compose) con il proprio
certificato Let's Encrypt, e non pubblica porte sull'host: si raggiunge solo dal
suo nome. Serve una auth key reusable in `TS_AUTHKEY`. Dettagli in
`DECISIONI-APERTE.md`, dove resta aperta la **cifratura del disco**.

### Rilasciare una versione

Il deploy è il merge della release PR. `release-please` la tiene aggiornata da
solo leggendo i commit convenzionali su `main`: mergiarla alza la versione,
scrive il `CHANGELOG.md` e pubblica una release. Da lì parte tutto il resto.

`.github/workflows/deploy.yml` costruisce l'immagine per quel tag, la pubblica su
`ghcr.io/vip-pana/funeral-docs`, e solo dopo chiede a Victus di installarla.
Sulla macchina non si compila più nulla: l'immagine in esecuzione è quella che la
CI ha prodotto.

I deploy automatici si evitano di solito per un buon motivo — una release che
richiede una chiave `.env` nuova manderebbe giù l'app senza nessuno a guardare.
Qui è la macchina a decidere, non il workflow: `scripts/deploy-release.sh`
rifiuta una release le cui chiavi `.env` non ha, copia il database prima di
toccare qualsiasi cosa, e se l'app non risponde rimette l'immagine precedente. Il
workflow si limita a dire quale versione.

### Come ci arriva un runner su una macchina senza porte aperte

GitHub entra nella tailnet come nodo usa-e-getta con tag `tag:ci`, che la ACL
lascia raggiungere un solo host su una sola porta:

```json
{ "src": ["tag:ci"], "dst": ["tag:prod"], "ip": ["tcp:22"] }
```

Si collega come utente `deploy`, la cui **login shell è
`/usr/local/sbin/deploy-shell`** (`scripts/deploy-shell.sh`): un wrapper che
accetta un solo comando, `deploy <app> <versione>`, controlla l'app contro una
whitelist e la versione contro una regex, e lancia lo script attraverso una
regola sudoers per singolo comando. Dietro quell'account non c'è nessuna shell
interattiva, e non c'è nessuna chiave ssh da nessuna parte: è Tailscale SSH ad
autenticare l'identità sulla tailnet.

Lo stesso wrapper serve anche wealth-tracker sulla stessa macchina: l'app è un
argomento, non un secondo utente Unix.

### A mano

Sempre disponibile, per una correzione urgente o quando è il workflow a essere
rotto:

```bash
./scripts/deploy-release.sh 1.2.0
```

Fa le stesse cose: si sposta sul tag, controlla le chiavi `.env` nuove, copia il
database in `~/funeral-docs-backups`, scarica l'immagine, ricrea **solo** il
container `app` — mai il sidecar Tailscale, che ricreato perderebbe l'identità
del nodo e slitterebbe a `funeral-docs-1` — e aspetta che la pagina di login
risponda.

Se non risponde entro due minuti rimette `APP_VERSION` al valore precedente e
ricrea il container: il rollback non costa una build, l'immagine vecchia è ancora
nello store locale. Il **database però non torna indietro**: le migrazioni della
versione fallita sono già applicate. Lo script lo dice a chiare lettere e indica
il backup appena preso; ripristinarlo resta una scelta manuale, perché
riscrivere un database in automatico butterebbe via tutto quello che è stato
salvato nel frattempo.

Per costruire l'immagine in locale invece di scaricarla — lavorando al
`Dockerfile`, o per far girare codice mai rilasciato:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.build.yml up -d --build
```
