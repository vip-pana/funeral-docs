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

export function GeneratePanel({ practiceId }: { practiceId: string }) {
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
   * Each file is fetched first and then saved from a local blob. Pointing the
   * <a> straight at the API would fire several navigations in quick
   * succession, which Chrome treats as "multiple downloads": it asks for
   * permission and, until that is granted, drops everything but the first
   * file. With blobs the page never navigates and the block never triggers.
   */
  async function handleDownload() {
    if (!chosen.length || downloading) return;
    setDownloading(true);

    let done = 0;

    try {
      for (const doc of chosen) {
        const res = await fetch(
          `/api/deceased/${practiceId}/generate?doc=${doc.id}`,
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
