import { PasswordForm } from "./password-form";

export const metadata = { title: "Impostazioni — Documenti funebri" };

export default function ImpostazioniPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-muted-foreground text-sm">
          Accesso al gestionale. Mezzi e personale stanno in Risorse.
        </p>
      </div>
      <PasswordForm />
    </div>
  );
}
