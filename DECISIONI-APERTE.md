# Decisioni aperte

Cose rimandate durante lo sviluppo. Da riprendere prima del deploy sul serverino.

## 0. Docker — FATTO

Funziona in locale: `docker compose -f docker-compose.prod.yml up -d --build`,
tutte le 6 suite passano contro il container, i dati sopravvivono al riavvio.
Immagine ~543 MB. Istruzioni nel README.

Resta da fare **solo per il serverino**:

- `BIND_ADDRESS` all'indirizzo tailnet (`tailscale ip -4`, un 100.x.y.z). Il
  default è `127.0.0.1`, che da un'altra macchina non risponde.
- Il `.env` va creato sul server: hash e secret suoi, non quelli di sviluppo.
- `COOKIE_SECURE=false` è già il default in produzione — necessario perché
  l'accesso via Tailscale è in http e il browser non concede a un IP
  l'eccezione che fa per `localhost`. Da rimettere a `true` solo dietro un
  reverse proxy https.

## 1. Templates: volume o dentro l'immagine?

**Ora**: dentro l'immagine (`COPY templates/`). Semplice, parte subito.

**Da valutare**: montarli come volume, così un modulo modificato dal Comune non
richiede un rebuild. Consigliato per la prod.

Se si passa a volume: `templates/` va nel `.dockerignore`, il compose monta
`${FUNERAL_TEMPLATES_DIR}:/app/templates`, e serve un controllo all'avvio che
fallisca se la cartella è vuota (stesso principio del DB in wealth-tracker).

## 2. Backup: solo locale o anche fuori dal serverino?

**Ora**: niente backup automatico.

**Da fare**: cron notturno → `tar.gz` di SQLite + docx generati, retention 30
giorni (come `BACKUP_RETENTION_DAYS` in wealth-tracker).

**Aperto**: il backup finirebbe sullo stesso disco del DB. Se il disco muore,
muore tutto. Valutare una copia verso un secondo posto — NAS, altra macchina
Tailscale, storage cifrato remoto.

## 3. Disco cifrato sul serverino

Il DB contiene codici fiscali e dati di decesso in chiaro. Tailscale protegge la
rete, non il disco. Verificare che il serverino abbia LUKS (o equivalente)
attivo, altrimenti chi porta via la macchina legge tutto.

## 4. Campi ancora a penna

Lasciati volutamente fuori dall'app (decisione presa). Elenco completo in
`templates/FIELDS.md`. Da promuovere a campi solo se diventano fastidiosi:
protocolli, n. autorizzazione, documento d'identità, testimoni, sezione
ricevente del doc 4.

## 5. GDPR / registro dei trattamenti

L'app tratta dati del richiedente/familiare (vivente → GDPR si applica). Non
blocca lo sviluppo, ma l'impresa dovrebbe avere un registro dei trattamenti che
menzioni anche lo strumento digitale, non solo la carta.

## 6. PDF

Rimandato. I documenti hanno campi da riempire a penna, quindi il DOCX resta il
formato utile. Quando servirà: LibreOffice headless nell'immagine
(`soffice --convert-to pdf`), pesa ~400MB — valutare un'immagine separata.
