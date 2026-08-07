"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ComuneField } from "@/components/comune-field";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import {
  Field as FieldRoot,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Driver, Practice, Vehicle } from "@/lib/db/schema";
import { FIELD_LABELS } from "@/lib/fields";
import { computeTaxCode } from "@/lib/tax-code";
import { parseTaxCode } from "@/lib/validation";

import type { PracticeFormState } from "./actions";

type Action = (
  state: PracticeFormState,
  formData: FormData,
) => Promise<PracticeFormState>;

export function PracticeForm({
  action,
  practice,
  vehicles,
  drivers,
  submitLabel,
}: {
  action: Action;
  practice?: Practice;
  vehicles: Vehicle[];
  drivers: Driver[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<PracticeFormState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Tells the user which fields were derived from the tax code.
  const [fromTaxCode, setFromTaxCode] = useState({ birth: false, city: false });
  const [firstName, setFirstName] = useState(practice?.personFirstName ?? "");
  const [lastName, setLastName] = useState(practice?.personLastName ?? "");
  const [sex, setSex] = useState<"M" | "F">(practice?.personSex ?? "M");
  const [taxCode, setTaxCode] = useState(practice?.personTaxCode ?? "");
  const [birthDate, setBirthDate] = useState(practice?.personBirthDate ?? "");
  const [birthCity, setBirthCity] = useState(practice?.personBirthCity ?? "");
  // The tax code computation needs the cadastral code, not the name, so it is
  // kept whenever the municipality is picked from the list.
  const [birthCode, setBirthCode] = useState("");
  const [computed, setComputed] = useState(false);
  const [destinationCity, setDestinationCity] = useState(
    practice?.destinationCity ?? "",
  );
  const [province, setProvince] = useState(practice?.destinationProvince ?? "");
  const [vehicleId, setVehicleId] = useState(
    practice?.vehicleId ?? "",
  );

  const [driverId, setDriverId] = useState(
    practice?.driverId ?? "",
  );

  // The vehicle may have been deleted after saving: the practice keeps the
  // plate, but the list no longer has an entry to select.
  const missingVehicle = Boolean(
    practice?.vehiclePlate && !vehicles.some((v) => v.id === vehicleId),
  );

  // Same for the driver, which keeps the copied name.
  const missingDriver = Boolean(
    practice?.driverName && !drivers.some((d) => d.id === driverId),
  );

  useEffect(() => {
    if (state.message) {
      if (state.errors) toast.error(state.message);
      else toast.success(state.message);
    }
  }, [state]);

  /**
   * The cadastral code is deliberately not required here: when it is missing —
   * which happens on reopening a saved practice, where only the municipality
   * name survives — it is looked up on click instead.
   */
  const canCompute = Boolean(
    firstName.trim() && lastName.trim() && birthDate && birthCity.trim(),
  );

  /**
   * On demand only: the computed code can differ from the real one through
   * omocodia, and silently overwriting a value copied from the health card
   * would be worse than proposing nothing.
   */
  async function handleCompute() {
    let code = birthCode;

    // Municipality typed by hand, or practice reopened: recover the cadastral
    // code from the name, which is the only thing stored.
    if (!code && birthCity.trim()) {
      const res = await fetch(
        `/api/municipalities?q=${encodeURIComponent(birthCity.trim())}`,
      );
      if (res.ok) {
        const found: { nome: string; codice: string }[] = await res.json();
        const exact = found.find(
          (c) => c.nome.toLowerCase() === birthCity.trim().toLowerCase(),
        );
        if (exact) {
          code = exact.codice;
          setBirthCode(exact.codice);
        }
      }
    }

    const cf = computeTaxCode({
      firstName,
      lastName,
      birthDate,
      cadastralCode: code,
      isFemale: sex === "F",
    });

    if (!cf) {
      toast.error(
        code
          ? "Dati insufficienti per calcolare il codice fiscale."
          : `Comune «${birthCity}» non riconosciuto: scegline uno dall'elenco.`,
      );
      return;
    }

    setTaxCode(cf);
    setComputed(true);
    toast.success("Codice fiscale calcolato: confrontalo con la tessera.");
  }

  const err = (name: string) => state.errors?.[name];
  const val = (name: keyof Practice) =>
    practice ? (practice[name] as string) : undefined;

  /**
   * The tax code carries birth date and municipality. They are filled in
   * automatically, but only where the field is still empty — a hand-entered
   * value must not be overwritten.
   */
  async function handleTaxCode(event: React.FocusEvent<HTMLInputElement>) {
    const parsed = parseTaxCode(event.target.value);
    if (!parsed) return;

    if (!birthDate) {
      setBirthDate(parsed.birthDate);
      setFromTaxCode((s) => ({ ...s, birth: true }));
    }
    // Sex is encoded in the birth day: above 40 means female.
    setSex(parsed.isFemale ? "F" : "M");

    if (!birthCity) {
      const res = await fetch(
        `/api/municipalities?codice=${parsed.cadastralCode}`,
      );
      if (res.ok) {
        const comune = await res.json();
        setBirthCity(comune.nome);
        setBirthCode(comune.codice);
        setFromTaxCode((s) => ({ ...s, city: true }));
      }
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Defunto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="personFirstName"
            label={FIELD_LABELS.personFirstName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={err("personFirstName")}
            autoFocus={!practice}
          />
          <Field
            name="personLastName"
            label={FIELD_LABELS.personLastName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={err("personLastName")}
          />
          <FieldRoot>
            <FieldLabel htmlFor="personSex">Sesso</FieldLabel>
            <Select
              name="personSex"
              value={sex}
              onValueChange={(v) => setSex(v as "M" | "F")}
            >
              <SelectTrigger id="personSex" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Maschile</SelectItem>
                <SelectItem value="F">Femminile</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Serve al calcolo del codice fiscale
            </FieldDescription>
          </FieldRoot>
          <Field
            name="personBirthDate"
            label={FIELD_LABELS.personBirthDate}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            error={err("personBirthDate")}
            hint={fromTaxCode.birth ? "Ricavata dal codice fiscale" : undefined}
          />
          <ComuneField
            name="personBirthCity"
            label={FIELD_LABELS.personBirthCity}
            value={birthCity}
            onChange={setBirthCity}
            onPick={(c) => setBirthCode(c.codice)}
            error={err("personBirthCity")}
            hint={fromTaxCode.city ? "Ricavato dal codice fiscale" : undefined}
          />
          {/* `items-start` plus a fixed margin on the button: aligning to the
              bottom would make it jump as the hint or an error appears below
              the field. */}
          <div className="flex items-start gap-2">
            <Field
              name="personTaxCode"
              label={FIELD_LABELS.personTaxCode}
              value={taxCode}
              onChange={(e) => {
                setTaxCode(e.target.value.toUpperCase());
                setComputed(false);
              }}
              error={err("personTaxCode")}
              onBlur={handleTaxCode}
              inputClassName="uppercase"
              className="flex-1"
              hint={
                computed
                  ? "Calcolato: confrontalo con la tessera sanitaria"
                  : "Compila da solo data e comune di nascita"
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCompute}
              disabled={!canCompute}
              // Drops down to the input's height, clearing the label above.
              className="mt-[calc(--spacing(6)+2px)] shrink-0"
              title={
                canCompute
                  ? "Calcola dal nome, cognome, data e comune di nascita"
                  : "Servono nome, cognome, data e comune di nascita (scelto dall'elenco)"
              }
            >
              Calcola
            </Button>
          </div>
          <ComuneField
            name="personResidenceCity"
            label={FIELD_LABELS.personResidenceCity}
            defaultValue={val("personResidenceCity")}
            error={err("personResidenceCity")}
          />
          <Field
            name="personResidenceAddress"
            label={FIELD_LABELS.personResidenceAddress}
            defaultValue={val("personResidenceAddress")}
            error={err("personResidenceAddress")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decesso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="personDeathDate"
            label={FIELD_LABELS.personDeathDate}
            type="date"
            defaultValue={val("personDeathDate")}
            error={err("personDeathDate")}
          />
          <Field
            name="personDeathTime"
            label={FIELD_LABELS.personDeathTime}
            type="time"
            defaultValue={val("personDeathTime")}
            error={err("personDeathTime")}
          />
          <ComuneField
            name="personDeathCity"
            label={FIELD_LABELS.personDeathCity}
            defaultValue={val("personDeathCity")}
            error={err("personDeathCity")}
          />
          <Field
            name="personDeathPlace"
            label={FIELD_LABELS.personDeathPlace}
            defaultValue={val("personDeathPlace")}
            error={err("personDeathPlace")}
            hint="Es. ospedale, abitazione"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trasporto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="transportDate"
            label={FIELD_LABELS.transportDate}
            type="date"
            defaultValue={val("transportDate")}
            error={err("transportDate")}
          />
          <Field
            name="transportTime"
            label={FIELD_LABELS.transportTime}
            type="time"
            defaultValue={val("transportTime")}
            error={err("transportTime")}
          />
          <Field
            name="transportPermitDate"
            label={FIELD_LABELS.transportPermitDate}
            type="date"
            defaultValue={val("transportPermitDate")}
            error={err("transportPermitDate")}
          />
          <Field
            name="funeralChurch"
            label={FIELD_LABELS.funeralChurch}
            defaultValue={val("funeralChurch")}
            error={err("funeralChurch")}
            hint="Facoltativo"
          />
          <FieldRoot>
            <FieldLabel htmlFor="vehicleId">Autofunebre</FieldLabel>
            {/* No "none" entry: Radix forbids a SelectItem with an empty
                value, and a sentinel value would fail validation. The
                placeholder already covers that case. */}
            <Select
              name="vehicleId"
              value={vehicleId}
              onValueChange={setVehicleId}
            >
              <SelectTrigger id="vehicleId" className="w-full">
                <SelectValue placeholder="Nessuna" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} — {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {/* The recorded plate comes first: if the vehicle was deleted,
                  saying only "no hearse configured" would suggest the document
                  comes out without a plate, when the practice still holds
                  one. */}
              {missingVehicle
                ? `Mezzo non piu' in elenco. Targa registrata: ${practice?.vehiclePlate}`
                : vehicles.length === 0
                  ? "Nessuna autofunebre configurata: aggiungila in Impostazioni."
                  : "La targa finisce nei documenti 2, 3 e 4"}
            </FieldDescription>
          </FieldRoot>
          <FieldRoot>
            <FieldLabel htmlFor="driverId">Conducente</FieldLabel>
            {/* Same as the hearse above: no "none" entry, the placeholder
                covers it. */}
            <Select name="driverId" value={driverId} onValueChange={setDriverId}>
              <SelectTrigger id="driverId" className="w-full">
                <SelectValue placeholder="Nessuno" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {missingDriver
                ? `Conducente non piu' in elenco. Nome registrato: ${practice?.driverName}`
                : drivers.length === 0
                  ? "Nessun conducente configurato: aggiungilo in Impostazioni."
                  : "Il nome finisce nel documento 4"}
            </FieldDescription>
          </FieldRoot>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destinazione</CardTitle>
          <CardDescription>Dove viene trasportato il feretro.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <ComuneField
            name="destinationCity"
            label={FIELD_LABELS.destinationCity}
            value={destinationCity}
            onChange={setDestinationCity}
            // The province is derived from the chosen municipality: filled in
            // automatically, but still editable.
            onPick={(c) => setProvince(c.provincia)}
            error={err("destinationCity")}
          />
          <Field
            name="destinationProvince"
            label={FIELD_LABELS.destinationProvince}
            value={province}
            onChange={(e) => setProvince(e.target.value.toUpperCase())}
            error={err("destinationProvince")}
            maxLength={2}
            inputClassName="uppercase"
            hint="Sigla, es. FG"
          />
          <Field
            name="destinationCemetery"
            label={FIELD_LABELS.destinationCemetery}
            defaultValue={val("destinationCemetery")}
            error={err("destinationCemetery")}
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
