# Decisioni aperte

Cose rimandate durante lo sviluppo. Da riprendere prima del deploy sul serverino.

## 0. Docker e deploy — FATTO

In produzione su **Victus**, raggiungibile dalla tailnet a
**<https://funeral-docs.tail134f9a.ts.net>**.

L'app ha un **nodo Tailscale suo**, non una porta sul nome della macchina: un
sidecar `tailscale/tailscale` nel compose si registra con hostname
`funeral-docs` e ottiene il proprio certificato. L'app gira nel suo stack di
rete (`network_mode: service:tailscale`), quindi **non pubblica porte**: non è
raggiungibile sull'host, nemmeno su loopback, e l'unico ingresso è la :443 del
nodo. Lo stesso schema vale per wealth-tracker sulla stessa macchina, e il nome
`victus` resta libero per Portainer.

Serve una **auth key reusable e non ephemeral** in `TS_AUTHKEY` (nel `.env`, non
nel compose che è tracciato): non ephemeral perché il nodo deve restare
registrato anche a container fermo, altrimenti il nome slitterebbe a
`funeral-docs-1` a ogni ricreazione. Lo stato del nodo sta nel volume
`tailscale-state` per la stessa ragione.

`COOKIE_SECURE=true`: con un nome e un certificato validi il cookie di sessione
può avere il flag. Accedendo invece in http a un `100.x.y.z` il browser non
memorizzerebbe un cookie `secure` e l'accesso sarebbe impossibile — lì va
rimesso `false`, insieme a `BIND_ADDRESS` sull'indirizzo tailnet.

```bash
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
