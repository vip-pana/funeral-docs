"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteClient } from "../actions";

/**
 * Deletion cannot be undone: the first click asks for confirmation, the second
 * performs it. Records that used the client keep the copied name and stay
 * editable, but their documents come out without a declarant until another
 * client is picked.
 */
export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Elimina
      </Button>
    );
  }

  return (
    <form action={deleteClient.bind(null, clientId)} className="flex gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Annulla
      </Button>
      <Button type="submit" variant="destructive" size="sm">
        Confermi l&apos;eliminazione?
      </Button>
    </form>
  );
}
