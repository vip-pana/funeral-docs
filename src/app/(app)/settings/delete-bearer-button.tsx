"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { deleteBearer } from "./bearer-actions";

/**
 * Removal cannot be undone: the first click asks for confirmation, the second
 * performs it. Records that listed the bearer keep the name anyway.
 */
export function DeleteBearerButton({ bearerId }: { bearerId: string }) {
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
      action={deleteBearer.bind(null, bearerId)}
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
      {/* Short label: this sits in a table cell, not a heading. */}
      <Button type="submit" variant="destructive" size="sm">
        Confermi?
      </Button>
    </form>
  );
}
