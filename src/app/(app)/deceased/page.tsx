import { desc, like, or } from "drizzle-orm";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/docs/render";

import { SearchBox } from "./search-box";

export const metadata = { title: "Defunti — Documenti funebri" };

/**
 * The list comes from the database and changes on every saved record.
 * Without this Next prerenders it at build time and production would forever
 * serve the list frozen at that moment.
 */
export const dynamic = "force-dynamic";

export default async function DefuntiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // LIKE with wildcards on both sides: matches anywhere in the field. At this
  // archive size an index is not worth it.
  const pattern = `%${query}%`;
  const rows = await db
    .select()
    .from(schema.practices)
    .where(
      query
        ? or(
            like(schema.practices.personLastName, pattern),
            like(schema.practices.personFirstName, pattern),
            like(schema.practices.personTaxCode, pattern),
            like(schema.practices.personDeathCity, pattern),
            like(schema.practices.destinationCity, pattern),
          )
        : undefined,
    )
    .orderBy(desc(schema.practices.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Defunti</h1>
          <p className="text-sm text-muted-foreground">
            {/* Whole words, not stem + ending: concatenating a stem with a
                suffix already produced a wrong plural once. */}
            {query
              ? `${rows.length} ${rows.length === 1 ? "risultato" : "risultati"} per «${query}».`
              : rows.length === 0
                ? "Nessun defunto registrato."
                : `${rows.length} ${rows.length === 1 ? "defunto" : "defunti"}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/deceased/new">Nuovo defunto</Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <SearchBox initial={query} />
      </Suspense>

      {rows.length > 0 ? (
        <>
          {/* Phones get one card per record, the whole of it a link: five
              columns do not fit, and "Apri" would end up off screen. */}
          <ul className="divide-y overflow-hidden rounded-xl border md:hidden">
            {rows.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/deceased/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {p.personLastName} {p.personFirstName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Decesso {formatDate(p.personDeathDate)} · Trasporto{" "}
                      {formatDate(p.transportDate)}
                    </p>
                    {p.destinationCity && (
                      <p className="truncate text-xs text-muted-foreground">
                        Destinazione {p.destinationCity}
                      </p>
                    )}
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Not "Defunto": the page is already titled that, and the
                      column holds the name. */}
                  <TableHead>Nominativo</TableHead>
                  <TableHead>Decesso</TableHead>
                  <TableHead>Trasporto</TableHead>
                  <TableHead>Destinazione</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.personLastName} {p.personFirstName}
                    </TableCell>
                    <TableCell>{formatDate(p.personDeathDate)}</TableCell>
                    <TableCell>{formatDate(p.transportDate)}</TableCell>
                    <TableCell>{p.destinationCity}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/deceased/${p.id}`}>Apri</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        query && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nessun defunto corrisponde alla ricerca.
          </p>
        )
      )}
    </div>
  );
}
