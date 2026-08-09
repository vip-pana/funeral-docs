"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { ComuneField } from "@/components/comune-field";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client } from "@/lib/db/schema";
import { FIELD_LABELS } from "@/lib/fields";

import type { ClientFormState } from "./actions";

type Action = (
  state: ClientFormState,
  formData: FormData,
) => Promise<ClientFormState>;

/**
 * The field names are the client columns, without the `owner` prefix the
 * template placeholders still carry. `clientValues` in src/lib/clients.ts maps
 * one onto the other; the labels come from FIELD_LABELS, which describes the
 * placeholders.
 */
export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: Action;
  client?: Client;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.message) {
      if (state.errors) toast.error(state.message);
      else toast.success(state.message);
    }
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
            name="firstName"
            label={FIELD_LABELS.ownerFirstName}
            defaultValue={client?.firstName}
            error={err("firstName")}
            autoFocus={!client}
          />
          <Field
            name="middleName"
            label={FIELD_LABELS.ownerMiddleName}
            defaultValue={client?.middleName}
            error={err("middleName")}
            hint="Facoltativo"
          />
          <Field
            name="lastName"
            label={FIELD_LABELS.ownerLastName}
            defaultValue={client?.lastName}
            error={err("lastName")}
          />
        </CardContent>
      </Card>

      {/* Only the allegati (documents 6 to 9) print these, so they are all
          optional: a client saved without them stays valid. */}
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
            name="birthDate"
            label={FIELD_LABELS.ownerBirthDate}
            type="date"
            defaultValue={client?.birthDate}
            error={err("birthDate")}
          />
          {/* Picked from the list rather than typed: the province printed
              beside it is derived from the name. */}
          <ComuneField
            name="birthCity"
            label={FIELD_LABELS.ownerBirthCity}
            defaultValue={client?.birthCity}
            error={err("birthCity")}
          />
          <Field
            name="citizenship"
            label={FIELD_LABELS.ownerCitizenship}
            defaultValue={client?.citizenship ?? "italiana"}
            error={err("citizenship")}
            hint="Es. italiana — documento 9"
          />
          <Field
            name="address"
            label={FIELD_LABELS.ownerAddress}
            defaultValue={client?.address}
            error={err("address")}
            hint="Via e numero civico"
          />
          <Field
            name="postalCode"
            label={FIELD_LABELS.ownerPostalCode}
            defaultValue={client?.postalCode}
            error={err("postalCode")}
          />
          <Field
            name="idType"
            label={FIELD_LABELS.ownerIdType}
            defaultValue={client?.idType}
            error={err("idType")}
            hint="Es. CARTA D'IDENTITA"
          />
          <Field
            name="idNumber"
            label={FIELD_LABELS.ownerIdNumber}
            defaultValue={client?.idNumber}
            error={err("idNumber")}
          />
          <Field
            name="idIssuer"
            label={FIELD_LABELS.ownerIdIssuer}
            defaultValue={client?.idIssuer}
            error={err("idIssuer")}
            hint="Es. COMUNE DI SAN SEVERO"
          />
          <Field
            name="idDate"
            label={FIELD_LABELS.ownerIdDate}
            type="date"
            defaultValue={client?.idDate}
            error={err("idDate")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="companyName"
            label={FIELD_LABELS.ownerCompanyName}
            defaultValue={client?.companyName}
            error={err("companyName")}
          />
          <ComuneField
            name="companyCity"
            label={FIELD_LABELS.ownerCompanyCity}
            defaultValue={client?.companyCity}
            error={err("companyCity")}
          />
          <ComuneField
            name="city"
            label={FIELD_LABELS.ownerCity}
            defaultValue={client?.city}
            error={err("city")}
            hint="Il Comune a cui si presenta la domanda"
          />
          <ComuneField
            name="cityName"
            label={FIELD_LABELS.ownerCityName}
            defaultValue={client?.cityName}
            error={err("cityName")}
            hint="Da dove parte il feretro"
          />
        </CardContent>
      </Card>

      {/* Not printed by any document: these are the details the office needs to
          invoice the client. The labels are literal rather than FIELD_LABELS,
          which only describes the .docx placeholders. */}
      <Card>
        <CardHeader>
          <CardTitle>Dati fiscali e contatti</CardTitle>
          <CardDescription>
            Servono per la fatturazione e per avere i recapiti a portata di mano:
            non finiscono in nessun documento.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="companyVatNumber"
            label="Partita IVA"
            defaultValue={client?.companyVatNumber}
            error={err("companyVatNumber")}
            hint="11 cifre"
          />
          <Field
            name="companyTaxCode"
            label="Codice fiscale"
            defaultValue={client?.companyTaxCode}
            error={err("companyTaxCode")}
            hint="11 cifre per una societa', 16 caratteri per una persona"
          />
          <ComuneField
            name="companyAddressCity"
            label="Comune"
            defaultValue={client?.companyAddressCity}
            error={err("companyAddressCity")}
          />
          <Field
            name="companyAddress"
            label="Indirizzo"
            defaultValue={client?.companyAddress}
            error={err("companyAddress")}
            hint="Via e numero civico"
          />
          <Field
            name="companyPostalCode"
            label="CAP"
            defaultValue={client?.companyPostalCode}
            error={err("companyPostalCode")}
          />
          <Field
            name="companySdiCode"
            label="Codice univoco"
            defaultValue={client?.companySdiCode}
            error={err("companySdiCode")}
            hint="Codice destinatario SDI"
          />
          <Field
            name="companyPec"
            label="PEC"
            type="email"
            defaultValue={client?.companyPec}
            error={err("companyPec")}
          />
          <Field
            name="companyEmail"
            label="Email"
            type="email"
            defaultValue={client?.companyEmail}
            error={err("companyEmail")}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
