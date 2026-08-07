# Decisioni aperte

Cose rimandate durante lo sviluppo. Da riprendere prima del deploy sul serverino.

## 0. Docker e deploy — FATTO

In produzione su **Victus**, raggiungibile dalla tailnet a
**<https://victus.tail134f9a.ts.net>**.

Il container ascolta **solo su loopback** (`BIND_ADDRESS=127.0.0.1`) e l'unico
ingresso è `tailscale serve`, che fa da reverse proxy sulla :443 con un
certificato Let's Encrypt. Due conseguenze volute: l'app non è esposta
direttamente nemmeno dentro la tailnet, e `COOKIE_SECURE=true` — in http su un
indirizzo `100.x.y.z` il browser non memorizzava il cookie di sessione, che
quindi viaggiava senza il flag.

Se un giorno si torna ad accedere in http, `COOKIE_SECURE` va rimesso a `false`
o l'accesso diventa impossibile.

```bash
# sul server, una volta sola
sudo tailscale serve --bg 3000

# aggiornamenti
cd ~/funeral-docs && git pull && docker compose -f docker-compose.prod.yml up -d --build
```

Il codice arriva da un clone del repo privato via **deploy key di sola
lettura** (`~/.ssh/id_ed25519_funeral`, host alias `github-funeral`): vale per
quel solo repository e non può scrivere.

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
