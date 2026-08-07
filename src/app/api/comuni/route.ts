import { NextResponse, type NextRequest } from "next/server";

import { comuneByCode, searchComuni } from "@/lib/comuni";

/**
 * Comuni: ricerca per nome o risoluzione del codice catastale.
 *
 *   GET /api/comuni?q=fogg       -> elenco di suggerimenti
 *   GET /api/comuni?codice=D643  -> il singolo comune (o 404)
 *
 * L'elenco completo pesa ~200 KB: tenerlo sul server evita di spedirlo a ogni
 * caricamento di pagina. L'accesso e' gia' filtrato dal middleware.
 */
export async function GET(request: NextRequest) {
  const cache = { "Cache-Control": "private, max-age=3600" };
  const codice = request.nextUrl.searchParams.get("codice");

  if (codice) {
    const comune = comuneByCode(codice);
    return comune
      ? NextResponse.json(comune, { headers: cache })
      : NextResponse.json({ error: "Codice sconosciuto" }, { status: 404 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(searchComuni(q), { headers: cache });
}
