"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field as FieldRoot,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { DOCUMENTS, type DocumentId } from "@/lib/fields";

export function GeneratePanel({ practiceId }: { practiceId: number }) {
  const [selected, setSelected] = useState<Set<DocumentId>>(
    () => new Set(DOCUMENTS.map((d) => d.id)),
  );
  const [downloading, setDownloading] = useState(false);

  function toggle(id: DocumentId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const chosen = DOCUMENTS.filter((d) => selected.has(d.id));

  /**
   * Scarica i documenti selezionati, ognuno come .docx separato.
   *
   * Ogni file viene prima scaricato con `fetch` e poi salvato da un blob
   * locale. Puntare l'<a> direttamente all'API farebbe partire piu'
   * navigazioni ravvicinate, e Chrome le tratta come "download multipli":
   * chiede un permesso e, finche' non viene concesso, scarta tutto tranne il
   * primo file. Con i blob la pagina non naviga mai e il blocco non scatta.
   */
  async function handleDownload() {
    if (!chosen.length || downloading) return;
    setDownloading(true);

    let done = 0;

    try {
      for (const doc of chosen) {
        const res = await fetch(
          `/api/pratiche/${practiceId}/genera?doc=${doc.id}`,
        );

        if (!res.ok) {
          toast.error(`Impossibile generare «${doc.title}».`);
          continue;
        }

        // Il nome vero e' nell'header Content-Disposition.
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = /filename="([^"]+)"/.exec(disposition);
        const fileName = match?.[1] ?? `documento-${doc.id}.docx`;

        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Rilascia il blob: senza, la memoria resta occupata fino al reload.
        URL.revokeObjectURL(url);
        done++;
      }

      if (done) {
        toast.success(
          done === 1
            ? "Documento scaricato."
            : `${done} documenti scaricati.`,
        );
      }
    } catch {
      toast.error("Scaricamento interrotto.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Genera documenti</CardTitle>
        <CardDescription>
          Scegli quali stampare: ognuno viene scaricato come file .docx a se'
          stante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup className="gap-2">
          {DOCUMENTS.map((doc) => (
            // FieldLabel che avvolge un Field: shadcn lo rende una scheda
            // selezionabile, evidenziata quando la casella e' spuntata.
            <FieldLabel key={doc.id} htmlFor={`doc-${doc.id}`}>
              <FieldRoot orientation="horizontal">
                <Checkbox
                  id={`doc-${doc.id}`}
                  checked={selected.has(doc.id)}
                  onCheckedChange={() => toggle(doc.id)}
                />
                <FieldContent>
                  <FieldTitle>{doc.title}</FieldTitle>
                  <FieldDescription>{doc.description}</FieldDescription>
                </FieldContent>
              </FieldRoot>
            </FieldLabel>
          ))}
        </FieldGroup>

        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {chosen.length === 0
              ? "Nessun documento selezionato."
              : `${chosen.length} document${chosen.length === 1 ? "o" : "i"}.`}
          </p>
          <Button
            onClick={handleDownload}
            disabled={!chosen.length || downloading}
          >
            {downloading
              ? "Scaricamento…"
              : chosen.length > 1
                ? `Scarica ${chosen.length} file`
                : "Scarica"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
