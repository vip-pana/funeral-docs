import { NextResponse, type NextRequest } from "next/server";

import { comuneByCode, searchComuni } from "@/lib/comuni";

/**
 * Municipality lookup: search by name or resolve a cadastral code.
 *
 *   GET /api/comuni?q=fogg       -> list of suggestions
 *   GET /api/comuni?codice=D643  -> the single municipality (or 404)
 *
 * The full list weighs ~200 KB: keeping it on the server avoids shipping it on
 * every page load. Access is already filtered by the middleware.
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
