# Migrazione da Victus a un VPS

Da fare una volta. L'obiettivo: funeral-docs gira su un VPS Aruba invece che sul
computer in ufficio, allo stesso indirizzo
`https://funeral-docs.tail134f9a.ts.net`, sempre raggiungibile solo dalla
tailnet. wealth-tracker resta su Victus.

Cosa cambia: la macchina. Cosa resta uguale: immagine, compose, sidecar
Tailscale, flusso di deploy da release-please.

Costo: Aruba Cloud VPS O1I1 (1 vCPU, 1 GB, 20 GB) con IPv4 a 2,49 €/mese + IVA.
Il backup su Cloudflare R2 sta nel piano gratuito (10 GB, il database pesa pochi
MB).

L'account Aruba Cloud è a credito prepagato: col credito finito il VPS viene
sospeso. La ricarica automatica (Auto top-up, da una carta salvata) va attivata.

## 1. Il VPS

1. Su Aruba Cloud crea un **Cloud VPS O1I1** con **Ubuntu 24.04**, datacenter in
   Italia, accesso con chiave ssh (non password), e **IPv4 pubblico**. È
   un'opzione a pagamento che si sceglie solo alla creazione: senza, il VPS ha
   solo IPv6, e GitHub e ghcr.io non sono raggiungibili in IPv6 — niente clone,
   niente immagine.
2. Entra come root e prepara la macchina. Al primo avvio unattended-upgrades
   installa un centinaio di aggiornamenti e tiene il lock di apt per una
   ventina di minuti: un `apt-get install` nel frattempo fallisce, basta
   aspettare (o passare `-o DPkg::Lock::Timeout=900`).

   ```bash
   # Swap: con 1 GB di RAM, durante un deploy le immagini vecchia e nuova
   # convivono per qualche secondo. L'immagine di Aruba ha gia' un /swap da
   # 512 MB, gia' in /etc/fstab: lo si ingrandisce.
   swapoff /swap && rm /swap
   fallocate -l 2G /swap && chmod 600 /swap && mkswap /swap && swapon /swap

   # Docker
   curl -fsSL https://get.docker.com | sh

   # Utente che possiede checkout, .env e container (lo stesso nome di Victus:
   # deploy-shell.sh e sudoers puntano a /home/pana)
   adduser --disabled-password --gecos '' pana
   usermod -aG docker pana

   # Aggiornamenti di sicurezza automatici (su Ubuntu di solito gia' attivi)
   apt-get install -y unattended-upgrades
   ```

## 2. Tailscale sull'host

Serve per il deploy: il runner di GitHub entra con Tailscale SSH come su Victus.

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --ssh --advertise-tags=tag:prod --hostname=funeral-vps
```

Il nome `funeral-vps` è quello che andrà in `DEPLOY_HOST` (passo 7). Il tag
`tag:prod` è quello a cui l'ACL lascia arrivare `tag:ci` sulla 22: nessuna
modifica alla policy per il deploy.

Per entrare come root dopo aver chiuso la 22 pubblica (passo 9) — `pana` non ha
sudo — serve una regola Tailscale SSH in più: `autogroup:member` →
`tag:prod` come `root`, **con check mode**, così l'accesso root chiede una
conferma dal browser ogni 12 ore.

## 3. Checkout e accesso al registro

Come `pana`:

```bash
# Deploy key di sola lettura, nuova per questa macchina: aggiungila al repo
# (Settings → Deploy keys) senza permesso di scrittura.
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_funeral -N ''
cat >> ~/.ssh/config <<'EOF'
Host github-funeral
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_funeral
  IdentitiesOnly yes
EOF
git clone github-funeral:vip-pana/funeral-docs.git ~/funeral-docs

# L'immagine su ghcr.io e' privata: token classico con solo read:packages.
docker login ghcr.io -u vip-pana
```

## 4. Utente `deploy`

Come su Victus (istruzioni complete in testa a `scripts/deploy-shell.sh`), ma in
sudoers **solo la riga di funeral-docs**: wealth-tracker qui non c'è, e sudo
rifiuterà una richiesta per lui.

```bash
useradd --create-home deploy
install -m 755 -o root -g root /home/pana/funeral-docs/scripts/deploy-shell.sh /usr/local/sbin/deploy-shell
usermod --shell /usr/local/sbin/deploy-shell deploy
cat > /etc/sudoers.d/deploy <<'EOF'
deploy ALL=(pana) NOPASSWD: /home/pana/funeral-docs/scripts/deploy-release.sh
EOF
chmod 440 /etc/sudoers.d/deploy && visudo -c
```

## 5. Backup su R2

1. Su Cloudflare → R2 crea il bucket `funeral-docs-backup` (giurisdizione UE).
2. Crea un token API **Object Read & Write** limitato a quel bucket.
3. Tieni da parte access key, secret e l'endpoint
   `https://<account-id>.eu.r2.cloudflarestorage.com`.

## 6. Il passaggio

Il momento in cui l'app è giù: pochi minuti. Meglio fuori orario.

**Su Victus**, ferma l'app e prendi il database:

```bash
cd ~/funeral-docs
docker compose -f docker-compose.prod.yml down
# a container fermi il WAL e' gia' stato riversato nel file principale
ls -la data/        # funeral.db, e niente -wal (o -wal vuoto)
```

Nella console di Tailscale **elimina il dispositivo `funeral-docs`**: il nodo
nuovo si registrerà con lo stesso nome solo se quello vecchio non c'è più,
altrimenti diventerebbe `funeral-docs-1`.

Il nome resta, ma per Tailscale il nodo nuovo è un altro dispositivo: perde la
condivisione (Share) verso `centroservizieliseo@github` e prende un altro IP
100.x. Dopo il passo 6 va quindi ricondiviso, e la regola delle access controls
che apre la :443 a quell'account va aggiornata col nuovo IP (`tailscale status`).

Copia sul VPS il database e il `.env`, dalla tailnet o dalla 22 pubblica che a
questo punto è ancora aperta:

```bash
ssh pana@funeral-vps mkdir -p funeral-docs/data
scp data/funeral.db .env pana@funeral-vps:funeral-docs/
ssh pana@funeral-vps 'mv funeral-docs/funeral.db funeral-docs/data/'
```

**Sul VPS**, come `pana`:

```bash
cd ~/funeral-docs
git checkout v$(grep ^APP_VERSION= .env | cut -d= -f2)

# L'app gira come uid 1000 (l'utente node dell'immagine): la cartella dati deve
# essere sua. Sull'immagine Ubuntu di Aruba l'uid 1000 e' `ubuntu` e pana e'
# 1001, quindi la cartella va anche al gruppo pana, scrivibile: il backup di
# deploy-release.sh gira come pana e sposta la sua copia fuori da data/.
# (Le due root, da `ssh root@...`: pana non ha sudo.)
chown -R 1000:1000 data
chown 1000:pana data && chmod 2775 data

# Nel .env:
#  - TS_AUTHKEY: genera una auth key nuova (reusable, non ephemeral)
#  - aggiungi le quattro LITESTREAM_* del passo 5 (vedi .env.example)
nano .env

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs litestream   # deve dire "replicating"
```

Apri `https://funeral-docs.tail134f9a.ts.net`, entra e controlla che i defunti
ci siano tutti.

## 7. Deploy automatici sulla nuova macchina

Su GitHub → Settings → Secrets and variables → Actions → **Variables** crea
`DEPLOY_HOST` = `funeral-vps`. Senza, il workflow continua a puntare a `victus`.

Prova: rilancia l'ultimo run di **Deploy** dalla tab Actions, oppure dal VPS
`./scripts/deploy-release.sh <versione attuale>` — un redeploy della stessa
versione non cambia niente ed esercita tutta la catena.

## 8. Verifica del backup

Un backup mai ripristinato non è un backup. Da qualsiasi macchina con Docker e
il `.env`:

```bash
mkdir -p /tmp/restore
docker run --rm --env-file .env -v /tmp/restore:/data \
  -v "$PWD/docker/litestream/litestream.yml:/etc/litestream.yml:ro" \
  litestream/litestream:0.3.13 restore /data/funeral.db
ls -la /tmp/restore
```

Il file ripristinato si apre con qualsiasi client SQLite.

## 9. Pulizia

- **Firewall**: il pannello Aruba non ne ha uno per i VPS LowCost, quindi si
  chiude sull'host. Verifica prima che `tailscale ssh root@funeral-vps` funzioni
  (passo 2), poi come root:

  ```bash
  # Solo chiave: anche col firewall aperto per errore, nessuna password da indovinare.
  # Il file in sshd_config.d vince sui valori di sshd_config.
  printf '%s\n' 'PasswordAuthentication no' 'KbdInteractiveAuthentication no' \
    'PermitRootLogin prohibit-password' > /etc/ssh/sshd_config.d/00-hardening.conf
  sshd -t && systemctl reload ssh

  # Sicura: se ci si chiude fuori, tra 5 minuti il firewall si spegne da solo.
  systemd-run --on-active=5min --unit=ufw-failsafe /usr/sbin/ufw disable
  ufw default deny incoming && ufw default allow outgoing
  ufw allow in on tailscale0
  ufw allow 41641/udp            # connessioni dirette di Tailscale
  ufw --force enable
  ```

  Da un'altra finestra prova `tailscale ssh root@funeral-vps`; se entra,
  `systemctl stop ufw-failsafe.timer`. Da qui in poi si entra solo con
  `tailscale ssh`: non serve nessuna porta aperta, nemmeno per l'app (il
  container non pubblica porte, quindi Docker non scavalca ufw).

- **Victus**: togli la riga di funeral-docs da `/etc/sudoers.d/deploy`, e quando
  sei sicuro che tutto va archivia `~/funeral-docs/data` (contiene ancora i dati
  in chiaro).
- **Deploy key** di Victus: eliminala dal repo.
- **Registro dei trattamenti**: aggiungi Aruba (datacenter IT1, Italia) e
  Cloudflare R2 (giurisdizione UE) come responsabili del trattamento. Non c'è
  niente da firmare: la nomina ex art. 28 è nelle condizioni di Aruba Cloud, e
  il DPA di Cloudflare nei suoi termini di servizio (scaricabile dalla
  dashboard).

## Se qualcosa va storto

Fino al passo 7 si torna indietro in un minuto: su Victus `docker compose -f
docker-compose.prod.yml up -d` (dopo aver eliminato dalla console il nodo
`funeral-docs` del VPS), e il database di Victus è quello di prima del
passaggio. Se nel frattempo sul VPS sono stati salvati dati, copia indietro il
`funeral.db` del VPS invece.
