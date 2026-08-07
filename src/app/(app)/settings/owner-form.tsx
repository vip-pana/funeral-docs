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
import type { Owner } from "@/lib/db/schema";
import { FIELD_LABELS } from "@/lib/fields";

import { saveOwner, type OwnerFormState } from "./actions";

export function OwnerForm({ owner }: { owner: Owner | null }) {
  const [state, formAction, pending] = useActionState<OwnerFormState, FormData>(
    saveOwner,
    {},
  );

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Salvato.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  const err = (name: string) => state.errors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dichiarante</CardTitle>
          <CardDescription>
            Chi firma le richieste e le dichiarazioni.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field
            name="ownerFirstName"
            label={FIELD_LABELS.ownerFirstName}
            defaultValue={owner?.ownerFirstName}
            error={err("ownerFirstName")}
          />
          <Field
            name="ownerMiddleName"
            label={FIELD_LABELS.ownerMiddleName}
            defaultValue={owner?.ownerMiddleName}
            error={err("ownerMiddleName")}
            hint="Facoltativo"
          />
          <Field
            name="ownerLastName"
            label={FIELD_LABELS.ownerLastName}
            defaultValue={owner?.ownerLastName}
            error={err("ownerLastName")}
          />
        </CardContent>
      </Card>

      {/* Only the allegati (documents 6 to 9) print these, so they are all
          optional: a configuration saved before those existed stays valid. */}
      <Card>
        <CardHeader>
          <CardTitle>Documento del dichiarante</CardTitle>
          <CardDescription>
            Serve solo agli allegati e ai moduli di cremazione, che identificano
            per esteso chi presenta la domanda.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="ownerBirthDate"
            label={FIELD_LABELS.ownerBirthDate}
            type="date"
            defaultValue={owner?.ownerBirthDate}
            error={err("ownerBirthDate")}
          />
          <Field
            name="ownerBirthCity"
            label={FIELD_LABELS.ownerBirthCity}
            defaultValue={owner?.ownerBirthCity}
            error={err("ownerBirthCity")}
          />
          <Field
            name="ownerCitizenship"
            label={FIELD_LABELS.ownerCitizenship}
            defaultValue={owner?.ownerCitizenship}
            error={err("ownerCitizenship")}
            hint="Es. italiana — documento 9"
          />
          <Field
            name="ownerAddress"
            label={FIELD_LABELS.ownerAddress}
            defaultValue={owner?.ownerAddress}
            error={err("ownerAddress")}
            hint="Via e numero civico"
          />
          <Field
            name="ownerPostalCode"
            label={FIELD_LABELS.ownerPostalCode}
            defaultValue={owner?.ownerPostalCode}
            error={err("ownerPostalCode")}
          />
          <Field
            name="ownerIdType"
            label={FIELD_LABELS.ownerIdType}
            defaultValue={owner?.ownerIdType}
            error={err("ownerIdType")}
            hint="Es. CARTA D'IDENTITA"
          />
          <Field
            name="ownerIdNumber"
            label={FIELD_LABELS.ownerIdNumber}
            defaultValue={owner?.ownerIdNumber}
            error={err("ownerIdNumber")}
          />
          <Field
            name="ownerIdIssuer"
            label={FIELD_LABELS.ownerIdIssuer}
            defaultValue={owner?.ownerIdIssuer}
            error={err("ownerIdIssuer")}
            hint="Es. COMUNE DI SAN SEVERO"
          />
          <Field
            name="ownerIdDate"
            label={FIELD_LABELS.ownerIdDate}
            type="date"
            defaultValue={owner?.ownerIdDate}
            error={err("ownerIdDate")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="ownerCompanyName"
            label={FIELD_LABELS.ownerCompanyName}
            defaultValue={owner?.ownerCompanyName}
            error={err("ownerCompanyName")}
          />
          <Field
            name="ownerCompanyCity"
            label={FIELD_LABELS.ownerCompanyCity}
            defaultValue={owner?.ownerCompanyCity}
            error={err("ownerCompanyCity")}
          />
          <Field
            name="ownerCity"
            label={FIELD_LABELS.ownerCity}
            defaultValue={owner?.ownerCity}
            error={err("ownerCity")}
            hint="Il Comune a cui si presenta la domanda"
          />
          <Field
            name="ownerCityName"
            label={FIELD_LABELS.ownerCityName}
            defaultValue={owner?.ownerCityName}
            error={err("ownerCityName")}
            hint="Da dove parte il feretro"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva impostazioni"}
        </Button>
      </div>
    </form>
  );
}
