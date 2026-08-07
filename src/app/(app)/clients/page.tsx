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
          <p className="text-muted-foreground text-sm">
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
        <div className="overflow-x-auto">
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
                  <TableCell className="font-medium">{c.companyName}</TableCell>
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
      ) : (
        <p className="text-muted-foreground text-sm">
          Aggiungi il primo cliente: senza, non si può registrare un defunto,
          perché i documenti resterebbero senza dichiarante e senza impresa.
        </p>
      )}
    </div>
  );
}
