import Link from "next/link";

import { listBearerDays } from "@/lib/bearer-days";
import { listBearers } from "@/lib/bearers";
import { byShoulderHeight, parseMonth } from "@/lib/calendar";

import { type CalendarMode, CalendarView } from "./calendar-view";

export const metadata = { title: "Calendario — Documenti funebri" };

export const dynamic = "force-dynamic";

const MODES: CalendarMode[] = ["persona", "giorno", "mese"];

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; who?: string; day?: string }>;
}) {
  const params = await searchParams;
  const month = parseMonth(params.month);
  const [bearers, days] = await Promise.all([
    listBearers(),
    listBearerDays(month),
  ]);
  const mode = MODES.find((m) => m === params.view) ?? null;
  const day = Number(params.day);

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold">Calendario necrofori</h1>
        <p className="text-muted-foreground text-sm">
          Tocca un giorno per segnare ferie o servizi svolti.
        </p>
      </div>

      {bearers.length > 0 ? (
        <CalendarView
          // Keyed on the month so the optimistic state starts over on change.
          key={month}
          month={month}
          bearers={[...bearers].sort(byShoulderHeight)}
          days={days}
          initialMode={mode}
          initialBearer={params.who}
          initialDay={Number.isInteger(day) && day > 0 ? day : undefined}
        />
      ) : (
        <p className="text-muted-foreground text-sm">
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
