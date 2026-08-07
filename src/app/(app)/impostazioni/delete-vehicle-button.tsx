"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteVehicle } from "./vehicle-actions";

/**
 * La rimozione non si annulla: il primo clic chiede conferma, il secondo
 * esegue. Le pratiche che usavano il mezzo tengono comunque la targa.
 */
export function DeleteVehicleButton({ vehicleId }: { vehicleId: number }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Elimina
      </Button>
    );
  }

  return (
    <form
      action={deleteVehicle.bind(null, vehicleId)}
      className="flex justify-end gap-2"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Annulla
      </Button>
      {/* Testo corto: sta in una cella di tabella, non in un'intestazione. */}
      <Button type="submit" variant="destructive" size="sm">
        Confermi?
      </Button>
    </form>
  );
}
