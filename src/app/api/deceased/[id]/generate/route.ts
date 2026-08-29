import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { getClient, clientValues } from "@/lib/clients";
import { provinciaOf } from "@/lib/comuni";
import { db, schema } from "@/lib/db";
import { renderDocument, documentFileName } from "@/lib/docs/render";
import { DOCUMENTS, type DocumentId } from "@/lib/fields";

/**
 * Today's date in Rome as yyyy-mm-dd. `toISOString` would answer in UTC, which
 * is the day before between midnight and 01:00 (02:00 with daylight saving).
 */
function todayInRome(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Generates one document of a practice.
 *
 *   GET /api/deceased/<uuid>/generate?doc=3&date=2026-08-29 -> doc 3 as .docx
 *   GET /api/deceased/<uuid>/generate                        -> the first one
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

  // The compilation date comes from the page: the user picks which date the
  // documents carry, so a practice reprinted months later can still be dated
  // the day it was filled in. Anything that is not a yyyy-mm-dd falls back to
  // today in Rome, which is also what an older link without the parameter gets.
  const requestedDate = request.nextUrl.searchParams.get("date") ?? "";
  const documentDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : todayInRome();

  // Read live rather than copied onto the record: correcting a client's address
  // fixes every document reprinted afterwards. Null when the client was deleted
  // — the placeholders then come out empty, as they do for a record saved
  // before there was one.
  const client = practice.clientId ? await getClient(practice.clientId) : null;

  // Every province printed by the documents is derived from the municipality
  // beside it rather than stored, so the two can never disagree. Empty for a
  // name that is not in the ISTAT list, or shared by two municipalities in
  // different provinces.
  const prov = (city: string | undefined) =>
    city ? (provinciaOf(city) ?? "") : "";

  const values = {
    ...practice,
    ...clientValues(client),
    // The template placeholders are still called {ownerVehiclePlate} and
    // {ownerDriverName}, but the values are the ones copied onto the practice at
    // save time. They sit after both spreads because the later assignment wins:
    // this is their only source, and what makes a months-old practice
    // reprintable.
    ownerVehiclePlate: practice.vehiclePlate,
    ownerDriverName: practice.driverName,
    personBirthProvince: prov(practice.personBirthCity),
    personResidenceProvince: prov(practice.personResidenceCity),
    personDeathProvince: prov(practice.personDeathCity),
    crematoryProvince: prov(practice.crematoryCity),
    funeralStopProvince: prov(practice.funeralStopCity),
    ashesProvince: prov(practice.ashesCity),
    ownerBirthProvince: prov(client?.birthCity),
    ownerCompanyProvince: prov(client?.companyCity),
    // The compilation date is the one chosen on the page, not the one from
    // when the practice was saved.
    todayDate: documentDate,
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
