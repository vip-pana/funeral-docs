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
import { Input } from "@/components/ui/input";
import { DOCUMENTS, type DocumentId } from "@/lib/fields";

/**
 * Today's date in Rome as yyyy-mm-dd, the value an <input type="date"> wants.
 * `toISOString` would answer in UTC, which is the day before between midnight
 * and 01:00 (02:00 with daylight saving).
 */
function todayInRome(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function GeneratePanel({ practiceId }: { practiceId: string }) {
  const [selected, setSelected] = useState<Set<DocumentId>>(
    () => new Set(DOCUMENTS.map((d) => d.id)),
  );
  const [downloading, setDownloading] = useState(false);
  // Today's date only as a starting point: it is what is printed at the foot
  // of every document, and reprinting an old practice usually means dating it
  // back to the day it was filled in.
  const [documentDate, setDocumentDate] = useState(todayInRome);

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
   * Each file is fetched first and then saved from a local blob. Pointing the
   * <a> straight at the API would fire several navigations in quick
   * succession, which Chrome treats as "multiple downloads": it asks for
   * permission and, until that is granted, drops everything but the first
   * file. With blobs the page never navigates and the block never triggers.
   */
  async function handleDownload() {
    if (!chosen.length || downloading || !documentDate) return;
    setDownloading(true);

    let done = 0;

    try {
      for (const doc of chosen) {
        const res = await fetch(
          `/api/deceased/${practiceId}/generate?doc=${doc.id}&date=${documentDate}`,
        );

        if (!res.ok) {
          toast.error(`Impossibile generare «${doc.title}».`);
          continue;
        }

        // The real name is in the Content-Disposition header.
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
        // Release the blob: otherwise the memory stays held until reload.
        URL.revokeObjectURL(url);
        done++;

        // Chrome drops downloads fired too close together, even from blobs: at
        // ten documents the last one silently never arrived. A pause between
        // clicks is enough, and costs a second in all on a full set.
        if (done < chosen.length) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
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
          Scegli quali stampare: ognuno viene scaricato come file .docx a
          s&eacute; stante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FieldGroup className="gap-2">
          {DOCUMENTS.map((doc) => (
            // A FieldLabel wrapping a Field: shadcn renders it as a selectable
            // card, highlighted when the checkbox is ticked.
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

        <FieldRoot className="max-w-60">
          <FieldLabel htmlFor="documentDate">Data sui documenti</FieldLabel>
          <Input
            id="documentDate"
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            aria-describedby="documentDate-hint"
          />
          <FieldDescription id="documentDate-hint">
            La data di compilazione stampata in fondo a ogni documento.
          </FieldDescription>
        </FieldRoot>

        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {chosen.length === 0
              ? "Nessun documento selezionato."
              : `${chosen.length} document${chosen.length === 1 ? "o" : "i"}.`}
          </p>
          <Button
            onClick={handleDownload}
            disabled={!chosen.length || downloading || !documentDate}
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
