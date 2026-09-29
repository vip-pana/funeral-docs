"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Bearer } from "@/lib/db/schema";
import { useFormReset } from "@/lib/use-form-reset";

import { type BearerFormState, updateBearer } from "./bearer-actions";

/**
 * The place where a bearer's details are changed. A dialog rather than more
 * inline inputs: the row stays readable as fields are added.
 */
export function EditBearerDialog({ bearer }: { bearer: Bearer }) {
  const [open, setOpen] = useState(false);
  // Stable, or the form's effect would fire again on every re-render and
  // repeat its toast.
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Modifica
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica necroforo</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the saved
            values and no stale error. */}
        {open && <EditBearerForm bearer={bearer} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}

function EditBearerForm({
  bearer,
  onDone,
}: {
  bearer: Bearer;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    BearerFormState,
    FormData
  >(updateBearer.bind(null, bearer.id), {});

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Salvato.");
      onDone();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, onDone]);

  // After a rejected save the fields keep what was typed, not the saved values.
  const { ref: formRef } = useFormReset();
  const err = (name: string) => state.errors?.[name];

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <Field
        name="editBearerName"
        label="Nome"
        defaultValue={bearer.name}
        error={err("editBearerName")}
      />
      <Field
        name="editBearerShoulderHeight"
        label="Altezza spalla (cm)"
        type="number"
        inputMode="numeric"
        min={100}
        max={200}
        defaultValue={bearer.shoulderHeight ?? ""}
        error={err("editBearerShoulderHeight")}
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          id="editBearerIsDriver"
          name="editBearerIsDriver"
          defaultChecked={bearer.isDriver}
        />
        Conducente
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          id="editBearerHasContract"
          name="editBearerHasContract"
          defaultChecked={bearer.hasContract}
        />
        Contratto
      </label>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Annulla
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva"}
        </Button>
      </DialogFooter>
    </form>
  );
}
