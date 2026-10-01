import Link from "next/link";

import { listBearerDays } from "@/lib/bearer-days";
import { listBearersByPosition } from "@/lib/bearers";
import { daysOfMonth, todayIso, toMark, totalUpTo } from "@/lib/calendar";
import { isoDate } from "@/lib/validation";

import { type ExtractionRow, ExtractionView } from "./extraction-view";

export const metadata = { title: "Estrai necrofori — Documenti funebri" };

export const dynamic = "force-dynamic";

/**
 * Who to send to a funeral on a given day. The month's totals and the day's
 * marks are worked out here; the choice itself happens in the browser, so it
 * follows the inputs without a round trip.
 */
export default async function EstrazionePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; back?: string }>;
}) {
  const params = await searchParams;
  const date =
    params.date && isoDate.safeParse(params.date).success
      ? params.date
      : todayIso();
  const month = date.slice(0, 7);
  // Back to the calendar as it was left: the view, the bearer and the day.
  // Only a calendar address is followed, so the link cannot be made to lead
  // anywhere else.
  const back = params.back?.startsWith("/calendar?")
    ? params.back
    : `/calendar?month=${month}&view=giorno&day=${Number(date.slice(8))}`;
  const [bearers, days] = await Promise.all([
    listBearersByPosition(),
    listBearerDays(month),
  ]);

  const calendar = daysOfMonth(month);
  const rows: ExtractionRow[] = bearers.map((b) => {
    const marks = new Map(
      days
        .filter((d) => d.bearerId === b.id)
        .map((d) => [d.date, toMark(d)] as const),
    );
    return {
      bearer: b,
      // Up to the funeral's day, that day included: ferie still to come
      // must not count against anyone yet.
      total: totalUpTo(
        calendar.map((d) => marks.get(d.date)),
        calendar,
        date,
        b.hasContract,
      ),
      mark: marks.get(date),
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Estrai necrofori</h1>
        <p className="text-sm text-muted-foreground">
          Proposta per un funerale: altezze simili, sempre almeno un conducente,
          e precedenza a chi ha il totale più basso fino a quel giorno (le ferie
          ancora da venire non contano). Correggila a mano, poi segna il
          servizio.{" "}
          <Link href={back} className="underline">
            Torna al calendario
          </Link>
        </p>
      </div>

      {rows.length > 0 ? (
        // Keyed on the date: a new day starts from its own proposal.
        <ExtractionView key={date} date={date} back={params.back} rows={rows} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Nessun necroforo configurato. Aggiungili in{" "}
          <Link href="/resources" className="underline">
            Risorse
          </Link>
          .
        </p>
      )}
    </div>
  );
}
