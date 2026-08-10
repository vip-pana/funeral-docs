#!/bin/bash
#
# Deploy a released version on Victus: pull the image CI built for that tag, pin
# it in .env, recreate the container, and prove the app came back before
# declaring success.
#
#   ./scripts/deploy-release.sh 1.2.0        # or v1.2.0
#
# This is also the only thing GitHub Actions can run on this machine (see the
# "Deploy automatico" section of the README): the deploy account's login shell
# forces it, so a stolen workflow secret cannot do anything but deploy a valid
# tag of a known app. That is why the version is validated as a version and
# nothing here interpolates it into a shell command.
#
# It refuses to deploy — rather than trying and failing halfway — when the new
# release needs an .env key this machine does not have. That failure mode is the
# reason unattended deploys are usually avoided: a missing key would otherwise
# take the app down with nobody watching.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Invoked from ssh, the working directory is the deploy account's home, which is
# mode 750 and unreadable to the user this runs as: docker compose fails with
# "stat .: permission denied" while validating the compose file, before doing
# anything. Every path below is absolute anyway; this is for the tools.
cd "$ROOT"

ENV_FILE="$ROOT/.env"
COMPOSE=(docker compose -f "$ROOT/docker-compose.prod.yml")
IMAGE="ghcr.io/vip-pana/funeral-docs"

# Where the pre-deploy database copies go. Outside the checkout on purpose: the
# script does a `git checkout` of the tag, and backups must not be something git
# can see, stash or clean.
BACKUP_DIR="${FUNERAL_BACKUP_DIR:-$HOME/funeral-docs-backups}"
BACKUP_RETENTION_DAYS="${FUNERAL_BACKUP_RETENTION_DAYS:-30}"

# How long to wait for the login page after recreating. The container's own
# start_period is 20s, and the migrations run before the server listens.
HEALTH_TIMEOUT=120

log() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31mFAILED: %s\033[0m\n' "$1" >&2; exit 1; }

# --- input ------------------------------------------------------------------
# Accepted shape is a release version and nothing else. Anything that is not
# 1.2.3 or v1.2.3 stops here, before it can reach git, docker, or a shell.
RAW="${1:-}"
[ -n "$RAW" ] || fail "usage: deploy-release.sh <version>   (e.g. 1.2.0)"

if ! [[ "$RAW" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    fail "'$RAW' is not a release version (expected 1.2.3 or v1.2.3)"
fi

VERSION="${RAW#v}"
TAG="v$VERSION"

[ -f "$ENV_FILE" ] || fail ".env not found at $ENV_FILE"

env_get() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- || true; }

env_set() {
    local key="$1" value="$2"
    if grep -q "^$key=" "$ENV_FILE"; then
        # GNU sed: no empty-string argument after -i (that is the BSD form).
        sed -i "s|^$key=.*|$key=$value|" "$ENV_FILE"
    else
        printf '\n%s=%s\n' "$key" "$value" >>"$ENV_FILE"
    fi
}

PREVIOUS="$(env_get APP_VERSION)"

log "Deploying $VERSION (currently ${PREVIOUS:-unpinned})"

if [ "$PREVIOUS" = "$VERSION" ]; then
    # Not an error: a re-run of the same release is how you recover from a
    # half-finished deploy, and pulling the same digest is a no-op.
    echo "Already pinned to $VERSION — redeploying it."
fi

# --- the tag ----------------------------------------------------------------
# Fetch and validate it here, but check it out further down: everything between
# is a guard that can still refuse the deploy, and a refusal must leave the
# machine as it was.
log "Fetching $TAG"
git -C "$ROOT" fetch --tags --quiet origin || fail "cannot reach the git remote
(the remote uses an ssh alias: check ~/.ssh/config for the user running this)"
git -C "$ROOT" rev-parse --verify --quiet "refs/tags/$TAG" >/dev/null \
    || fail "tag $TAG does not exist on the remote"

# Uncommitted changes here are either an experiment someone left behind or an
# edit to a tracked file that the checkout would silently discard. .env is
# untracked, so this never trips on the file the deploy actually rewrites.
if ! git -C "$ROOT" diff --quiet || ! git -C "$ROOT" diff --cached --quiet; then
    fail "the checkout has uncommitted changes — resolve them before deploying"
fi

# --- env guard --------------------------------------------------------------
# Before the checkout, deliberately: this guard can reject the deploy, and a
# rejection has to leave the machine exactly as it was. Both sides are read with
# `git show <ref>:<path>`, which does not need the working tree to be at either
# tag, so nothing is lost by asking first.
# The failure mode this exists for: a release adds a required .env key, the
# deploy runs unattended, and the app comes up broken. So the question is
# specifically "does this upgrade introduce keys I do not have" — asked against
# the version being replaced, not against the whole .env.example.
#
# Comparing against the whole file instead would list every optional key the
# machine never set (most have a default, which is why the app has been running
# fine without them), and a guard that always complains gets switched off.
if [ -n "$PREVIOUS" ] && git -C "$ROOT" rev-parse --verify --quiet "refs/tags/v$PREVIOUS" >/dev/null; then
    log "Checking for new .env keys since $PREVIOUS"
    NEW_KEYS="$(
        comm -23 \
            <(git -C "$ROOT" show "$TAG:.env.example" | grep -oE '^[A-Z_][A-Z0-9_]*=' | tr -d '=' | sort -u) \
            <(git -C "$ROOT" show "v$PREVIOUS:.env.example" | grep -oE '^[A-Z_][A-Z0-9_]*=' | tr -d '=' | sort -u)
    )"

    # Of the keys this release adds, the ones this machine has never seen.
    MISSING="$(comm -23 \
        <(printf '%s\n' "$NEW_KEYS" | sed '/^$/d' | sort -u) \
        <(grep -oE '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE" | tr -d '=' | sort -u))"

    if [ -n "$MISSING" ]; then
        echo "$MISSING" | sed 's/^/  - /' >&2
        fail "$TAG introduces .env keys this machine does not have (listed above).
Add them to $ENV_FILE, then re-run. Nothing was changed: the app is still on $PREVIOUS.
If they are optional, add them empty — this check only asks whether you saw them."
    fi
else
    # First deploy through this script, or a previous version whose tag is gone.
    # There is no baseline to diff against, so this cannot be checked.
    echo "No previous release to compare .env against; skipping the new-key check."
fi

# Only now, once nothing above can still refuse: the compose file and this script
# come from the checkout, so it has to be at the tag being deployed. Detached
# HEAD is correct here — nothing on this machine commits.
log "Checking out $TAG"
git -C "$ROOT" checkout --quiet "$TAG"

# --- backup -----------------------------------------------------------------
# Before anything is replaced, and while the app is still healthy. The app has
# no backup command of its own, so this copies the SQLite file directly — via
# `.backup`, which is the only safe way to copy a database that is being
# written to: a plain cp of a file mid-transaction copies a torn WAL.
#
# The whole point is the migrations: the entrypoint applies them on boot, and a
# destructive one is not something a container rollback undoes.
log "Backing up the database"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/funeral-$STAMP-pre-$VERSION.db"

# Hardcoded, not read from the environment: this is the path *inside* the
# container, fixed by the Dockerfile and the compose file. Taking it from
# $DATABASE_PATH would pick up the host's own value — .env ships a relative
# ./data/funeral.db, which matches no mount destination and would send the
# lookup below down a confusing path.
DB_IN_CONTAINER=/data/funeral.db
DB_DIR_IN_CONTAINER="$(dirname "$DB_IN_CONTAINER")"

# The host directory behind /data — where the file will appear once the
# container has written it. Read from the running container rather than assumed,
# so this keeps working whatever FUNERAL_DATA_DIR is set to.
#
# Split across three statements on purpose: as a single `VAR="$(a "$(b)")"` the
# whole thing is one simple command, so a failure inside it exits the script
# under `set -e` before the guard below can run — leaving the operator with no
# message at all. Which is precisely the case of re-running a deploy after a
# half-finished one, when the container is down.
APP_CID="$("${COMPOSE[@]}" ps -q app)" || true
[ -n "$APP_CID" ] \
    || fail "the app container is not running, so the database cannot be backed up.
Start it first:  docker compose -f docker-compose.prod.yml up -d app"

DATA_DIR_ON_HOST="$(
    docker inspect -f \
        "{{range .Mounts}}{{if eq .Destination \"$DB_DIR_IN_CONTAINER\"}}{{.Source}}{{end}}{{end}}" \
        "$APP_CID"
)" || fail "docker inspect failed on the app container"

[ -n "$DATA_DIR_ON_HOST" ] \
    || fail "nothing is mounted at $DB_DIR_IN_CONTAINER in the app container — check the volumes in docker-compose.prod.yml"

# sqlite3 is not in the runtime image (node:22-slim), so the copy is made inside
# the container with the same better-sqlite3 the app uses.
#
# `.backup()` rather than a cp: it uses SQLite's own backup API, which produces a
# consistent file from a database being written to. A plain copy of a database in
# WAL mode gets whatever the main file held, without the pages still in the log.
# Not opened readonly — the backup API needs a read-write handle.
#
# It writes into the data volume, not /tmp, so the file lands directly on the
# host filesystem: piping it out through `docker compose exec` instead would send
# binary through a pty that can mangle it, and would need twice the space inside
# the container first.
# The existence check is not redundant: better-sqlite3 *creates* a missing
# database rather than failing, and its `fileMustExist` option does not stop it
# (checked against v13). Without this, a broken volume mount would produce a
# perfectly valid backup of an empty database and the deploy would carry on —
# losing the archive in exactly the case the backup exists for.
TEMP_NAME=".deploy-backup-$$.db"

# The copy is written next to the live database, so anything that goes wrong
# between here and the `mv` would leave a full-size orphan on the data volume —
# one per attempt, on the same disk the database needs space on.
trap 'rm -f "$DATA_DIR_ON_HOST/$TEMP_NAME"' EXIT

"${COMPOSE[@]}" exec -T app node -e "
  const fs = require('fs');
  if (!fs.existsSync('$DB_IN_CONTAINER')) {
    console.error('no database at $DB_IN_CONTAINER — is the data volume mounted?');
    process.exit(1);
  }
  const db = require('better-sqlite3')('$DB_IN_CONTAINER');
  db.backup('$DB_DIR_IN_CONTAINER/$TEMP_NAME')
    .then(() => { db.close(); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
" || fail "backup failed — refusing to deploy without one"

[ -s "$DATA_DIR_ON_HOST/$TEMP_NAME" ] \
    || fail "the backup came out empty — refusing to deploy"

# $BACKUP_DIR is usually on a different filesystem from the data volume, so this
# is a copy-then-unlink rather than a rename: it can fail halfway on a full disk,
# which is why the trap above is still armed for it.
mv "$DATA_DIR_ON_HOST/$TEMP_NAME" "$BACKUP_FILE" \
    || fail "could not move the backup into $BACKUP_DIR"

# Safely out of the data volume: nothing left to clean up.
trap - EXIT

echo "Backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Old copies, not the one just taken: -mtime is evaluated after this one is
# written, and +N never matches a file created seconds ago.
find "$BACKUP_DIR" -name 'funeral-*.db' -type f -mtime "+$BACKUP_RETENTION_DAYS" -delete 2>/dev/null || true

# --- pull -------------------------------------------------------------------
log "Pulling $IMAGE:$VERSION"
docker pull --quiet "$IMAGE:$VERSION" \
    || fail "no image published for $VERSION (did the Deploy workflow succeed?)"

# --- switch -----------------------------------------------------------------
# APP_VERSION is what compose reads, so this line is the deploy. Rolling back is
# the same line with the old value: the previous image is still in the local
# store, so it costs no build and no network.
log "Recreating the app on $VERSION"
env_set APP_VERSION "$VERSION"

rollback() {
    printf '\033[31m%s\033[0m\n' "Health check failed — rolling back to ${PREVIOUS:-latest}" >&2
    if [ -n "$PREVIOUS" ]; then
        env_set APP_VERSION "$PREVIOUS"
        # Back to the previous release's compose files by name, not `checkout -`:
        # that means "wherever HEAD was last", which after a second failed
        # attempt is the broken tag rather than the good one.
        git -C "$ROOT" checkout --quiet "v$PREVIOUS" 2>/dev/null || true
    else
        # Nothing was pinned before, so there is no known-good version to name.
        # Leaving the new pin in place is still better than pointing at `latest`,
        # which would resolve to this same broken release anyway.
        echo "No previous APP_VERSION to restore; leaving $VERSION pinned." >&2
    fi
    "${COMPOSE[@]}" up -d app >/dev/null 2>&1 || true

    # The image went back; the database did not. The entrypoint already applied
    # $VERSION's migrations before the app failed, and a schema the old code
    # does not know about is exactly what would keep it from starting either.
    # Restoring the file automatically is not done here on purpose: it would
    # silently discard anything written between the backup and the failure.
    fail "$VERSION did not come up healthy. The image was rolled back.

WARNING: $VERSION's migrations are already applied to the database. If the app
does not come back on ${PREVIOUS:-the previous version} either, restore the copy
taken before this deploy — after checking nothing was written since:

  docker compose -f docker-compose.prod.yml stop app
  rm -f $DATA_DIR_ON_HOST/funeral.db-wal $DATA_DIR_ON_HOST/funeral.db-shm
  cp $BACKUP_FILE $DATA_DIR_ON_HOST/funeral.db
  docker compose -f docker-compose.prod.yml up -d app

(the -wal and -shm files belong to the database being replaced: left in place,
SQLite would replay them onto the restored copy and corrupt it)

Logs:
  docker compose -f docker-compose.prod.yml logs --tail=80 app"
}

# Only `app` is recreated. The tailscale sidecar holds the node identity, and
# recreating it risks the tailnet name drifting to funeral-docs-1 — which would
# change the address the app is reached at.
"${COMPOSE[@]}" up -d app || rollback

# --- verify -----------------------------------------------------------------
# Compose returning 0 only means the container started, which a container whose
# migrations fail on boot also does, briefly. Ask the app.
log "Waiting for the login page (max ${HEALTH_TIMEOUT}s)"
deadline=$((SECONDS + HEALTH_TIMEOUT))
until "${COMPOSE[@]}" exec -T app \
        node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
    [ "$SECONDS" -lt "$deadline" ] || rollback
    sleep 3
done

log "Deployed $VERSION"
"${COMPOSE[@]}" ps app
