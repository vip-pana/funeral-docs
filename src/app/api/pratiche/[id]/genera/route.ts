import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db, schema } from "@/lib/db";
import { renderDocument, documentFileName } from "@/lib/docs/render";
import { DOCUMENTS, type DocumentId } from "@/lib/fields";
import { getOwner, ownerValues } from "@/lib/owner";

/**
 * Genera un documento di una pratica.
 *
 *   GET /api/pratiche/12/genera?doc=3   -> il documento 3 come .docx
 *   GET /api/pratiche/12/genera         -> il primo documento
 *
 * Un file per richiesta: la pagina ne chiede piu' d'uno in sequenza, cosi'
 * ogni documento arriva come .docx separato invece che dentro un archivio da
 * aprire.
 *
 * L'accesso e' gia' filtrato dal middleware.
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
    // Il placeholder nei template si chiama ancora {ownerVehiclePlate}, ma il
    // valore e' la targa copiata sulla pratica al salvataggio. Sta dopo
    // entrambi gli spread perche' l'assegnazione posizionale vince: e' l'unica
    // fonte della targa, e cio' che rende ristampabile una pratica di mesi fa.
    ownerVehiclePlate: practice.vehiclePlate,
    // La data di compilazione e' quella di oggi, non quella del salvataggio.
    todayDate: new Date().toISOString().slice(0, 10),
    // La domanda porta la data del trasporto: e' quando viene presentata.
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
