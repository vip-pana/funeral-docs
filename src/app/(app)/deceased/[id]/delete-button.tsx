"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { deletePractice } from "../actions";

/**
 * Deletion cannot be undone: the first click asks for confirmation, the second
 * performs it.
 */
export function DeleteButton({ practiceId }: { practiceId: string }) {
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
