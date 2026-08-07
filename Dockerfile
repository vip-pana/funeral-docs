# Stage 1: dipendenze
FROM node:22-slim AS deps

# better-sqlite3 e' un modulo nativo: senza toolchain non compila.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


# Stage 2: build
FROM node:22-slim AS build

RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Nessun segreto in fase di build: la connessione al database e la lettura di
# SESSION_SECRET avvengono alla prima richiesta, non all'import dei moduli.
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# Le migrazioni girano all'avvio del container. Compilarle qui in un unico file
# JavaScript evita di portare tsx e i suoi binari nell'immagine finale: con pnpm
# i pacchetti sono link simbolici dentro .pnpm/, e copiarli a mano significa
# inseguire un albero di dipendenze che si rompe a ogni aggiornamento.
RUN pnpm dlx esbuild@0.25 scripts/migrate.ts \
      --bundle --platform=node --format=cjs \
      --external:better-sqlite3 \
      --outfile=migrate.cjs


# Stage 3: runtime
FROM node:22-slim AS runner

RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Il database vive su un volume montato; il percorso e' fisso nel container.
ENV DATABASE_PATH=/data/funeral.db

# L'output standalone porta con se' solo i moduli che servono davvero.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# I template sono gia' dentro standalone/ grazie a outputFileTracingIncludes,
# ma _backup/ non serve in produzione.
RUN rm -rf ./templates/_backup

# Migrazioni: il file compilato piu' gli SQL. better-sqlite3 e' escluso dal
# bundle perche' nativo; standalone lo porta con se' ma sotto node_modules/.pnpm,
# senza un link al primo livello, quindi il require va aiutato con un symlink.
COPY --from=build /app/migrate.cjs ./migrate.cjs
COPY --from=build /app/drizzle ./drizzle

RUN ln -s "$(find /app/node_modules/.pnpm -maxdepth 4 -type d \
      -path '*/better-sqlite3@*/node_modules/better-sqlite3' | head -1)" \
      /app/node_modules/better-sqlite3

COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

# Il processo non gira come root: se qualcuno esce dall'app, esce come utente
# senza privilegi.
RUN chown -R node:node /app
USER node

EXPOSE 3000

ENTRYPOINT ["entrypoint"]
CMD ["node", "server.js"]
