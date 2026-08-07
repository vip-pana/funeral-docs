import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Il container esegue il server Node prodotto qui, senza node_modules.
  output: "standalone",

  // better-sqlite3 e' un modulo nativo: va richiesto a runtime, non impacchettato.
  serverExternalPackages: ["better-sqlite3"],

  outputFileTracingIncludes: {
    // I .docx sono letti da disco a runtime. Senza questa riga il tracing non
    // li vede (il percorso si compone a runtime) e l'immagine parte senza
    // template, fallendo solo al primo tentativo di generazione.
    "/**": ["./templates/*.docx"],
  },
};

export default nextConfig;
