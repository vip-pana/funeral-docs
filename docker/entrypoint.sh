#!/bin/sh
set -e

# Senza queste due l'app parte e fallisce solo al primo tentativo di accesso,
# con un errore che arriva all'utente e non a chi ha fatto il deploy.
if [ -z "$SESSION_SECRET" ]; then
  echo "ERRORE: SESSION_SECRET non impostata (minimo 32 caratteri)." >&2
  echo "  openssl rand -base64 32" >&2
  exit 1
fi

if [ -z "$AUTH_PASSWORD_HASH" ]; then
  echo "ERRORE: AUTH_PASSWORD_HASH non impostata." >&2
  echo "  pnpm auth:hash '<password>'" >&2
  exit 1
fi

# Il parser .env espande i `$`: un hash arrivato troncato non corrisponde a
# nessuna password e ogni accesso fallirebbe senza spiegazione.
case "$AUTH_PASSWORD_HASH" in
  '$2a$'*|'$2b$'*|'$2y$'*) ;;
  *)
    echo "ERRORE: AUTH_PASSWORD_HASH non sembra un hash bcrypt." >&2
    echo "Nel file .env ogni \$ va scritto come \\\$." >&2
    exit 1
    ;;
esac

# Il database sta su un volume montato. Se il mount fallisce, la directory non
# esiste: creare un database vuoto qui farebbe partire l'app come se fosse
# nuova, nascondendo la perdita dell'archivio. Meglio non partire.
DB_DIR="$(dirname "$DATABASE_PATH")"
if [ ! -d "$DB_DIR" ]; then
  echo "ERRORE: $DB_DIR non esiste." >&2
  echo "Il volume dei dati non risulta montato: controlla docker-compose." >&2
  exit 1
fi

if [ ! -w "$DB_DIR" ]; then
  echo "ERRORE: $DB_DIR non e' scrivibile dall'utente $(id -un) (uid $(id -u))." >&2
  echo "Correggi i permessi sulla directory host montata su $DB_DIR." >&2
  exit 1
fi

if [ ! -f "$DATABASE_PATH" ]; then
  echo "Database assente: verra' creato al primo avvio ($DATABASE_PATH)."
fi

# I template devono esserci: senza, la generazione fallisce solo al primo
# tentativo, quando l'utente ci sta gia' lavorando.
if [ ! -f /app/templates/1.docx ]; then
  echo "ERRORE: /app/templates non contiene i modelli .docx." >&2
  exit 1
fi

echo "Applico le migrazioni..."
node migrate.cjs

exec "$@"
