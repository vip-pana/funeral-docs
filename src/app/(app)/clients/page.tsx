import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { personName } from "@/lib/client-name";
import { listClients } from "@/lib/clients";

export const metadata = { title: "Clienti — Documenti funebri" };

// The list comes from the database and changes on every saved client.
export const dynamic = "force-dynamic";

export default async function ClientiPage() {
  const clients = await listClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Clienti</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length === 0
              ? "Nessun cliente registrato."
              : `${clients.length} ${clients.length === 1 ? "cliente" : "clienti"}. Per ogni defunto scegli chi presenta la domanda.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">Nuovo cliente</Link>
        </Button>
      </div>

      {clients.length > 0 ? (
        <>
          {/* One card per client on phones, the whole of it a link. */}
          <ul className="divide-y overflow-hidden rounded-xl border md:hidden">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/clients/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent active:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.companyName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[personName(c), c.companyCity]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
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
                  <TableHead>Ragione sociale</TableHead>
                  <TableHead>Dichiarante</TableHead>
                  <TableHead>Comune sede</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.companyName}
                    </TableCell>
                    <TableCell>{personName(c)}</TableCell>
                    <TableCell>{c.companyCity}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clients/${c.id}`}>Apri</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aggiungi il primo cliente: senza, non si può registrare un defunto,
          perché i documenti resterebbero senza dichiarante e senza impresa.
        </p>
      )}
    </div>
  );
}
