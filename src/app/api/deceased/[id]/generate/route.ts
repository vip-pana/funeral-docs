import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, schema } from "@/lib/db";
import { renderDocument, documentFileName } from "@/lib/docs/render";
import { DOCUMENTS, type DocumentId } from "@/lib/fields";
import { getOwner, ownerValues } from "@/lib/owner";

/**
 * Generates one document of a practice.
 *
 *   GET /api/deceased/<uuid>/generate?doc=3   -> document 3 as .docx
 *   GET /api/deceased/<uuid>/generate         -> the first document
 *
 * One file per request: the page asks for several in sequence, so each
 * document arrives as a separate .docx instead of inside an archive that has
 * to be opened. Access is already filtered by the middleware.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // No shape check on the id: a UUID goes to the query as it arrives, and
  // anything that matches no row is a 404 below — same answer the page gives.
  const [practice] = await db
    .select()
    .from(schema.practices)
    .where(eq(schema.practices.id, id))
    .limit(1);

  if (!practice) {
    return NextResponse.json({ error: "Defunto non trovato" }, { status: 404 });
  }

  const requested = request.nextUrl.searchParams.get("doc") ?? DOCUMENTS[0].id;
  const valid = DOCUMENTS.map((d) => d.id) as readonly string[];

  if (!valid.includes(requested)) {
    return NextResponse.json(
      { error: `Documento inesistente: ${requested}` },
      { status: 400 },
    );
  }

  const documentId = requested as DocumentId;

  const values = {
    ...practice,
    ...ownerValues(await getOwner()),
    // The template placeholders are still called {ownerVehiclePlate} and
    // {ownerDriverName}, but the values are the ones copied onto the practice at
    // save time. They sit after both spreads because the later assignment wins:
    // this is their only source, and what makes a months-old practice
    // reprintable.
    ownerVehiclePlate: practice.vehiclePlate,
    ownerDriverName: practice.driverName,
    // The compilation date is today's, not the one from when it was saved.
    todayDate: new Date().toISOString().slice(0, 10),
    // The request carries the transport date: that is when it is submitted.
    ownerRequestDate: practice.transportPermitDate,
  };

  const buffer = await renderDocument(documentId, values);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${documentFileName(values, documentId)}"`,
    },
  });
}
