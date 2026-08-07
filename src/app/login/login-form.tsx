"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field as FieldRoot,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );
  const [visible, setVisible] = useState(false);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Documenti funebri</CardTitle>
        <CardDescription>Inserisci la password per accedere.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />

          <FieldRoot data-invalid={state.error ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                autoFocus
                autoComplete="current-password"
                aria-invalid={state.error ? true : undefined}
                aria-describedby={state.error ? "login-error" : undefined}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  onClick={() => setVisible((v) => !v)}
                  // Keeps Tab on the password → submit path instead of
                  // stopping here.
                  tabIndex={-1}
                  aria-label={
                    visible ? "Nascondi la password" : "Mostra la password"
                  }
                  aria-pressed={visible}
                >
                  {visible ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {state.error && (
              <FieldError id="login-error">{state.error}</FieldError>
            )}
          </FieldRoot>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Accesso…" : "Accedi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
