import { NextResponse, type NextRequest } from "next/server";

import { comuneByCode, searchComuni } from "@/lib/comuni";

/**
 * Place lookup: search by name or resolve a cadastral code. Italian
 * municipalities and foreign states alike — someone born abroad has the code of
 * their country where a municipality's would be, starting with Z.
 *
 *   GET /api/municipalities?q=fogg       -> list of suggestions
 *   GET /api/municipalities?codice=D643  -> the single place (or 404)
 *   GET /api/municipalities?codice=Z112  -> Germany
 *
 * The full list weighs ~230 KB: keeping it on the server avoids shipping it on
 * every page load. The route keeps its name: renaming it would break nothing
 * but the links already written into the client components.
 * Access is already filtered by the middleware.
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
