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
scheda del cliente, mentre la qualità con cui presenta la domanda e i
necrofori si scelgono per ogni defunto. La provincia di nascita non è un campo:
viene ricavata dal comune tramite il dataset ISTAT.

## Deploy sul server

Vedi `DECISIONI-APERTE.md`: `BIND_ADDRESS` sull'indirizzo Tailscale, backup e
cifratura del disco sono ancora da sistemare.
