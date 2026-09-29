import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listBearerDays } from "@/lib/bearer-days";
import { listBearers } from "@/lib/bearers";
import { byShoulderHeight, monthLabel, parseMonth, shiftMonth } from "@/lib/calendar";

import { CalendarGrid } from "./calendar-grid";
import { PrintButton } from "./print-button";

export const metadata = { title: "Calendario — Documenti funebri" };

export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const month = parseMonth((await searchParams).month);
  const [bearers, days] = await Promise.all([
    listBearers(),
    listBearerDays(month),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Calendario necrofori</h1>
          <p className="text-muted-foreground text-sm">
            Clicca su un giorno per segnare ferie o servizi svolti.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/calendar?month=${shiftMonth(month, -1)}`}
              aria-label="Mese precedente"
            >
              <ChevronLeftIcon />
            </Link>
          </Button>
          <span className="w-28 text-center text-sm font-medium">
            {monthLabel(month)}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/calendar?month=${shiftMonth(month, 1)}`}
              aria-label="Mese successivo"
            >
              <ChevronRightIcon />
            </Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      {bearers.length > 0 ? (
        <CalendarGrid
          // Keyed on the month so the optimistic state starts over on change.
          key={month}
          month={month}
          bearers={[...bearers].sort(byShoulderHeight)}
          days={days}
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
