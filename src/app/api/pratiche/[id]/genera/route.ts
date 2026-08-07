import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, schema } from "@/lib/db";
import { renderDocument, documentFileName } from "@/lib/docs/render";
import { DOCUMENTS, type DocumentId } from "@/lib/fields";
import { getOwner, ownerValues } from "@/lib/owner";

/**
 * Generates one document of a practice.
 *
 *   GET /api/pratiche/12/genera?doc=3   -> document 3 as .docx
 *   GET /api/pratiche/12/genera         -> the first document
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
  const practiceId = Number(id);

  if (!Number.isInteger(practiceId)) {
    return NextResponse.json({ error: "Id non valido" }, { status: 400 });
  }

  const [practice] = await db
    .select()
    .from(schema.practices)
    .where(eq(schema.practices.id, practiceId))
    .limit(1);

  if (!practice) {
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });
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
    // The template placeholder is still called {ownerVehiclePlate}, but the
    // value is the plate copied onto the practice at save time. It sits after
    // both spreads because the later assignment wins: this is the only source
    // of the plate, and what makes a months-old practice reprintable.
    ownerVehiclePlate: practice.vehiclePlate,
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
