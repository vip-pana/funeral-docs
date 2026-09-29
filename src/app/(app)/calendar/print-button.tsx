"use client";

import { PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Icon only on a phone, where the view switch needs the room. */
export function PrintButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.print()}
      aria-label="Stampa"
    >
      <PrinterIcon />
      <span className="hidden sm:inline">Stampa</span>
    </Button>
  );
}
