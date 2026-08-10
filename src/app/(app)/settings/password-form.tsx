"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFormReset } from "@/lib/use-form-reset";

import { changePassword, type PasswordFormState } from "./actions";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    PasswordFormState,
    FormData
  >(changePassword, {});
  const { ref: formRef, reset } = useFormReset();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Salvato.");
      // Without the reset the three fields keep the password just set, in
      // clear as far as the browser is concerned. Only on success: a rejected
      // change keeps them, so the whole thing is not typed again.
      reset();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, reset]);

  const err = (name: string) => state.errors?.[name];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          La password è una sola, condivisa da chi usa il gestionale.
          Cambiandola non si viene disconnessi: le sessioni già aperte, anche
          sugli altri dispositivi, restano valide.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={formAction}
          className="grid max-w-md gap-4"
        >
          <Field
            name="currentPassword"
            label="Password attuale"
            type="password"
            autoComplete="current-password"
            error={err("currentPassword")}
          />
          <Field
            name="newPassword"
            label="Nuova password"
            type="password"
            autoComplete="new-password"
            error={err("newPassword")}
            hint="Almeno 8 caratteri"
          />
          <Field
            name="confirmPassword"
            label="Conferma nuova password"
            type="password"
            autoComplete="new-password"
            error={err("confirmPassword")}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Cambia password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
