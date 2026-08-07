"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { deletePractice } from "../actions";

/**
 * La cancellazione non si annulla: il primo clic chiede conferma, il secondo
 * esegue.
 */
export function DeleteButton({ practiceId }: { practiceId: number }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Elimina
      </Button>
    );
  }

  return (
    <form action={deletePractice.bind(null, practiceId)} className="flex gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Annulla
      </Button>
      <Button type="submit" variant="destructive" size="sm">
        Confermi l&apos;eliminazione?
      </Button>
    </form>
  );
}
