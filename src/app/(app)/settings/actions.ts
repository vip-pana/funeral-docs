"use server";

import { collectErrors } from "@/lib/form-errors";
import { setPassword, verifyPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";

export type PasswordFormState = {
  ok?: boolean;
  errors?: Record<string, string>;
  message?: string;
};

export async function changePassword(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      errors: collectErrors(parsed.error.issues),
      message: "Controlla i campi segnalati.",
    };
  }

  const { currentPassword, newPassword } = parsed.data;

  // The session alone is not enough to authorise this: a browser left open on
  // an office machine is exactly what the password guards against, and whoever
  // found it could otherwise change the password and lock everyone else out.
  if (!(await verifyPassword(currentPassword))) {
    return {
      errors: { currentPassword: "Password attuale errata" },
      message: "Controlla i campi segnalati.",
    };
  }

  // Refusing to reuse the current one: the form would otherwise report success
  // having changed nothing.
  if (newPassword === currentPassword) {
    return {
      errors: { newPassword: "La nuova password è uguale a quella attuale" },
      message: "Controlla i campi segnalati.",
    };
  }

  await setPassword(newPassword);

  // No revalidatePath: nothing on any page renders the password. The sessions
  // already open stay valid — the token is signed with SESSION_SECRET and
  // carries nothing derived from the password.
  return { ok: true, message: "Password aggiornata." };
}
