"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { ComuneField } from "@/components/comune-field";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field as FieldRoot,
  FieldDescription,
  FieldError,
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
// From lib/client-name, not lib/clients: that one opens the database, and this
// is a client component.
import { clientLabel } from "@/lib/client-name";
import type { Bearer, Client, Practice, Vehicle } from "@/lib/db/schema";
import { FIELD_LABELS } from "@/lib/fields";
import { computeTaxCode } from "@/lib/tax-code";
import { useFormReset } from "@/lib/use-form-reset";
import { parseTaxCode } from "@/lib/validation";

import type { PracticeFormState } from "./actions";

type Action = (
  state: PracticeFormState,
  formData: FormData,
) => Promise<PracticeFormState>;

export function PracticeForm({
  action,
  practice,
  clients,
  vehicles,
  drivers,
  bearers,
  submitLabel,
}: {
  action: Action;
  practice?: Practice;
  clients: Client[];
  vehicles: Vehicle[];
  /** Already filtered to the bearers flagged as drivers. */
  drivers: Bearer[];
  bearers: Bearer[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<PracticeFormState, FormData>(
    action,
    {},
  );
  // This form is never emptied on purpose: after creating a record the page
  // navigates away, and an edit keeps showing what was saved.
  const { ref: formRef } = useFormReset();
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
  // With a single client there is nothing to choose: preselecting it saves a
  // click on every record and still posts the id.
  const [clientId, setClientId] = useState(
    practice?.clientId ?? (clients.length === 1 ? clients[0].id : ""),
  );

  // Document 10. Both drive which sub-fields are shown: they are the first
  // conditional fields in the form, and the alternative — twelve inputs that
  // contradict one another, all but three of them always empty — reads far
  // worse than the card it would save.
  const [maritalStatus, setMaritalStatus] = useState(
    practice?.personMaritalStatus ?? "",
  );
  const [bodyDestination, setBodyDestination] = useState(
    practice?.bodyDestination ?? "",
  );

  // The client may have been deleted after saving: the record keeps the name,
  // but the list no longer has an entry to select.
  const missingClient = Boolean(
    practice?.clientName && !clients.some((c) => c.id === clientId),
  );

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

  // Stored as a comma-separated string of ids, so it survives a bearer being
  // deleted: the record keeps the names either way.
  const [bearerIds, setBearerIds] = useState(() =>
    practice?.bearerIds ? practice.bearerIds.split(",").filter(Boolean) : [],
  );

  // Some of the bearers on the record are no longer in the list, so the tick
  // boxes cannot show what was actually printed.
  const missingBearers = Boolean(
    practice?.bearerNames &&
      bearerIds.some((id) => !bearers.some((b) => b.id === id)),
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
   * Fills the invoice details from the mandator's. A one-off copy rather than
   * derived state: the two coincide often enough to be worth a click, but the
   * person paying is not always the one signing, so what lands in the fields
   * stays editable.
   *
   * Read straight off the form because these inputs are uncontrolled, as most
   * of this form is. The municipality is the exception — `ComuneField` keeps
   * its own state and only syncs a hidden input, so it cannot be written this
   * way and is left for the user to pick.
   */
  function copyMandateToBilling() {
    const form = formRef.current;
    if (!form) return;

    const get = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
    const set = (name: string, value: string) => {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      if (input) input.value = value;
    };

    set("billingName", `${get("mandateFirstName")} ${get("mandateLastName")}`.trim());
    set("billingTaxCode", get("mandateTaxCode"));
    set("billingPhone", get("mandatePhone"));
  }

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
      {/* First, before the deceased: it decides the declarant and the company
          named at the top of every document. */}
      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
          <CardDescription>
            Per conto di chi vengono emessi i documenti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldRoot data-invalid={err("clientId") ? true : undefined}>
            <FieldLabel htmlFor="clientId">Cliente</FieldLabel>
            {/* Same as the hearse below: no "none" entry, because Radix forbids
                a SelectItem with an empty value — and here none is not a valid
                choice anyway. */}
            <Select name="clientId" value={clientId} onValueChange={setClientId}>
              <SelectTrigger
                id="clientId"
                className="w-full"
                aria-invalid={err("clientId") ? true : undefined}
              >
                <SelectValue placeholder="Scegli un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {clientLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err("clientId") ? (
              <FieldError>{err("clientId")}</FieldError>
            ) : (
              <FieldDescription>
                {missingClient
                  ? `Cliente non piu' in elenco. Nome registrato: ${practice?.clientName}. Scegline un altro: senza, i documenti escono senza dichiarante.`
                  : "Dichiarante e impresa nei documenti"}
              </FieldDescription>
            )}
          </FieldRoot>
        </CardContent>
      </Card>

      {/* Only document 10 uses this card. Whoever confers the mandate is
          usually a relative of the deceased — neither the client company nor
          the deceased — so the details live on the practice. */}
      <Card>
        <CardHeader>
          <CardTitle>Mandante</CardTitle>
          <CardDescription>
            Chi conferisce il mandato. Serve solo al documento 10.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="mandateFirstName"
            label={FIELD_LABELS.mandateFirstName}
            defaultValue={val("mandateFirstName")}
            error={err("mandateFirstName")}
          />
          <Field
            name="mandateLastName"
            label={FIELD_LABELS.mandateLastName}
            defaultValue={val("mandateLastName")}
            error={err("mandateLastName")}
          />
          <Field
            name="mandateRelationship"
            label={FIELD_LABELS.mandateRelationship}
            defaultValue={val("mandateRelationship")}
            error={err("mandateRelationship")}
            hint="Es. figlio, coniuge, fratello"
          />
          <Field
            name="mandateBirthDate"
            label={FIELD_LABELS.mandateBirthDate}
            type="date"
            defaultValue={val("mandateBirthDate")}
            error={err("mandateBirthDate")}
          />
          <ComuneField
            name="mandateBirthCity"
            label={FIELD_LABELS.mandateBirthCity}
            defaultValue={val("mandateBirthCity")}
            error={err("mandateBirthCity")}
          />
          <ComuneField
            name="mandateResidenceCity"
            label={FIELD_LABELS.mandateResidenceCity}
            defaultValue={val("mandateResidenceCity")}
            error={err("mandateResidenceCity")}
          />
          <Field
            name="mandatePhone"
            label={FIELD_LABELS.mandatePhone}
            type="tel"
            defaultValue={val("mandatePhone")}
            error={err("mandatePhone")}
          />
          <Field
            name="mandateTaxCode"
            label={FIELD_LABELS.mandateTaxCode}
            defaultValue={val("mandateTaxCode")}
            error={err("mandateTaxCode")}
            inputClassName="uppercase"
          />
          <Field
            name="mandateIdType"
            label={FIELD_LABELS.mandateIdType}
            defaultValue={val("mandateIdType")}
            error={err("mandateIdType")}
            hint="Es. carta d'identità"
          />
          <Field
            name="mandateIdNumber"
            label={FIELD_LABELS.mandateIdNumber}
            defaultValue={val("mandateIdNumber")}
            error={err("mandateIdNumber")}
          />
        </CardContent>
      </Card>

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
          <Field
            name="personCitizenship"
            label={FIELD_LABELS.personCitizenship}
            defaultValue={practice?.personCitizenship ?? "italiana"}
            error={err("personCitizenship")}
            hint="Documento 9"
          />
          {/* Document 10 alone asks for these, and marks them optional on the
              printed form itself. */}
          <Field
            name="personFatherName"
            label={FIELD_LABELS.personFatherName}
            defaultValue={val("personFatherName")}
            error={err("personFatherName")}
            hint="Facoltativo, documento 10"
          />
          <Field
            name="personMotherName"
            label={FIELD_LABELS.personMotherName}
            defaultValue={val("personMotherName")}
            error={err("personMotherName")}
            hint="Facoltativo, documento 10"
          />
          <Field
            name="personProfession"
            label={FIELD_LABELS.personProfession}
            defaultValue={val("personProfession")}
            error={err("personProfession")}
            hint="Facoltativo, documento 10"
          />
        </CardContent>
      </Card>

      {/* Document 10 prints one tick box per option, so only the details of the
          chosen one are asked for: the three branches share the same fields and
          exclude one another. */}
      <Card>
        <CardHeader>
          <CardTitle>Stato civile</CardTitle>
          <CardDescription>
            Facoltativo. Serve solo al documento 10.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FieldRoot>
            <FieldLabel htmlFor="personMaritalStatus">Stato civile</FieldLabel>
            {/* Radix forbids a SelectItem with an empty value, so "not stated"
                stays the placeholder rather than an entry. Nothing extra is
                needed to post it: the hidden native select Radix keeps in the
                form adds an empty option of its own while the placeholder is
                showing, so the field arrives as "". */}
            <Select
              name="personMaritalStatus"
              value={maritalStatus}
              onValueChange={(v) =>
                setMaritalStatus(v as typeof maritalStatus)
              }
            >
              <SelectTrigger id="personMaritalStatus" className="w-full">
                <SelectValue placeholder="Non indicato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celibe">Celibe / Nubile</SelectItem>
                <SelectItem value="coniugato">Coniugato/a</SelectItem>
                <SelectItem value="separato">Separato/a legalmente</SelectItem>
                <SelectItem value="vedovo">Vedovo/a</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Spunta la casella corrispondente nel documento 10
            </FieldDescription>
          </FieldRoot>

          {maritalStatus === "coniugato" && (
            <Field
              name="marriageDate"
              label={FIELD_LABELS.marriageDate}
              type="date"
              defaultValue={val("marriageDate")}
              error={err("marriageDate")}
            />
          )}
          {maritalStatus === "separato" && (
            <Field
              name="separationDate"
              label={FIELD_LABELS.separationDate}
              type="date"
              defaultValue={val("separationDate")}
              error={err("separationDate")}
            />
          )}
          {maritalStatus === "vedovo" && (
            <>
              <Field
                name="widowedSpouseDeathDate"
                label={FIELD_LABELS.widowedSpouseDeathDate}
                type="date"
                defaultValue={val("widowedSpouseDeathDate")}
                error={err("widowedSpouseDeathDate")}
              />
              <ComuneField
                name="widowedSpouseDeathCity"
                label={FIELD_LABELS.widowedSpouseDeathCity}
                defaultValue={val("widowedSpouseDeathCity")}
                error={err("widowedSpouseDeathCity")}
              />
            </>
          )}

          {/* All three branches ask the same questions about the spouse in the
              same positions, and only one can be true, so the form asks once.
              The document has a placeholder per branch: the answers are copied
              into the chosen one when it is filled. The labels are written out
              here rather than taken from FIELD_LABELS, which names those
              per-branch fields and not this shared group. */}
          {maritalStatus !== "" && maritalStatus !== "celibe" && (
            <>
              <Field
                name="spouseName"
                label={
                  maritalStatus === "vedovo"
                    ? "Nome del coniuge defunto"
                    : "Nome del coniuge"
                }
                defaultValue={val("spouseName")}
                error={err("spouseName")}
              />
              {/* The widowed branch does not ask where the spouse was born or
                  lived, only where and when they died. */}
              {maritalStatus !== "vedovo" && (
                <>
                  <Field
                    name="spouseBirthDate"
                    label="Data di nascita del coniuge"
                    type="date"
                    defaultValue={val("spouseBirthDate")}
                    error={err("spouseBirthDate")}
                  />
                  <ComuneField
                    name="spouseBirthCity"
                    label="Comune di nascita del coniuge"
                    defaultValue={val("spouseBirthCity")}
                    error={err("spouseBirthCity")}
                  />
                  <ComuneField
                    name="spouseResidenceCity"
                    label="Comune di residenza del coniuge"
                    defaultValue={val("spouseResidenceCity")}
                    error={err("spouseResidenceCity")}
                  />
                </>
              )}
            </>
          )}
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
          {/* Document 10 details the route: where the hearse leaves from and at
              what time it stops for the service. */}
          <Field
            name="transportDeparturePlace"
            label={FIELD_LABELS.transportDeparturePlace}
            defaultValue={val("transportDeparturePlace")}
            error={err("transportDeparturePlace")}
            hint="Facoltativo, documento 10"
          />
          <Field
            name="funeralStopTime"
            label={FIELD_LABELS.funeralStopTime}
            type="time"
            defaultValue={val("funeralStopTime")}
            error={err("funeralStopTime")}
            hint="Facoltativo, documento 10"
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
                  ? "Nessuna autofunebre configurata: aggiungila in Risorse."
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
                  ? "Nessun conducente: in Risorse spunta la casella Conducente su un necroforo."
                  : "Il nome finisce nel documento 4"}
            </FieldDescription>
          </FieldRoot>
          <FieldRoot className="sm:col-span-2">
            <FieldLabel>Necrofori</FieldLabel>
            {/* Checkboxes, not a Select: several are chosen at once. Radix's
                Checkbox does not post anything, so each ticked one carries a
                hidden input with the same name — the server reads them as a
                list. */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {bearers.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={bearerIds.includes(b.id)}
                    onCheckedChange={(on) =>
                      setBearerIds((prev) =>
                        on ? [...prev, b.id] : prev.filter((id) => id !== b.id),
                      )
                    }
                  />
                  {b.name}
                </label>
              ))}
              {bearerIds.map((id) => (
                <input key={id} type="hidden" name="bearerIds" value={id} />
              ))}
            </div>
            <FieldDescription>
              {missingBearers
                ? `Elenco cambiato. Nomi registrati: ${practice?.bearerNames}`
                : bearers.length === 0
                  ? "Nessun necroforo configurato: aggiungili in Risorse."
                  : "I nomi finiscono nel documento 7"}
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
          {/* What becomes of the body: four tick boxes in document 10, of which
              two ask for details. Same placeholder-as-"not stated" trick as the
              marital status above. */}
          <FieldRoot className="sm:col-span-3">
            <FieldLabel htmlFor="bodyDestination">
              Destinazione della salma
            </FieldLabel>
            <Select
              name="bodyDestination"
              value={bodyDestination}
              onValueChange={(v) =>
                setBodyDestination(v as typeof bodyDestination)
              }
            >
              <SelectTrigger id="bodyDestination" className="w-full">
                <SelectValue placeholder="Non indicata" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inumata">
                  Inumata nel cimitero indicato
                </SelectItem>
                <SelectItem value="tumulata">
                  Tumulata in tomba già esistente
                </SelectItem>
                <SelectItem value="tumulataNuova">
                  Tumulata in sepoltura da prenotare
                </SelectItem>
                <SelectItem value="cremata">
                  Preventivamente cremata
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Spunta la casella corrispondente nel documento 10
            </FieldDescription>
          </FieldRoot>

          {bodyDestination === "tumulata" && (
            <>
              <Field
                name="concessionType"
                label={FIELD_LABELS.concessionType}
                defaultValue={val("concessionType")}
                error={err("concessionType")}
              />
              <Field
                name="concessionNumber"
                label={FIELD_LABELS.concessionNumber}
                defaultValue={val("concessionNumber")}
                error={err("concessionNumber")}
              />
            </>
          )}
          {bodyDestination === "cremata" && (
            <Field
              name="crematoryAra"
              label={FIELD_LABELS.crematoryAra}
              defaultValue={val("crematoryAra")}
              error={err("crematoryAra")}
            />
          )}
        </CardContent>
      </Card>

      {/* Only the two cremation forms use these, so they are all optional: a
          burial leaves the card empty. The provinces are not asked for — they
          are derived from the municipalities when the documents are filled. */}
      <Card>
        <CardHeader>
          <CardTitle>Cremazione</CardTitle>
          <CardDescription>
            Serve solo ai documenti 8 e 9. Lascia vuoto per una tumulazione.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ComuneField
            name="crematoryCity"
            label={FIELD_LABELS.crematoryCity}
            defaultValue={val("crematoryCity")}
            error={err("crematoryCity")}
          />
          <ComuneField
            name="funeralStopCity"
            label={FIELD_LABELS.funeralStopCity}
            defaultValue={val("funeralStopCity")}
            error={err("funeralStopCity")}
          />
          <ComuneField
            name="ashesCity"
            label={FIELD_LABELS.ashesCity}
            defaultValue={val("ashesCity")}
            error={err("ashesCity")}
          />
          <Field
            name="cremationConsentRelative"
            label={FIELD_LABELS.cremationConsentRelative}
            defaultValue={val("cremationConsentRelative")}
            error={err("cremationConsentRelative")}
            hint="Con la preposizione: es. dalla moglie, dal figlio"
          />
          <Field
            name="burialPermitDate"
            label={FIELD_LABELS.burialPermitDate}
            type="date"
            defaultValue={val("burialPermitDate")}
            error={err("burialPermitDate")}
          />
        </CardContent>
      </Card>

      {/* Who the invoice is made out to, document 10. Usually the person
          conferring the mandate, but whoever pays does not have to be the one
          who signs, so the two are separate. */}
      <Card>
        <CardHeader>
          <CardTitle>Fatturazione</CardTitle>
          <CardDescription>
            A chi intestare la fattura. Serve solo al documento 10.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FieldRoot className="sm:col-span-2">
            <div className="flex items-center gap-2">
              {/* Copies the mandator's details into the fields once, rather
                  than deriving them: the two coincide often enough to be worth
                  a click, and what lands here stays editable. */}
              <Checkbox
                id="billingSameAsMandate"
                onCheckedChange={(checked) => {
                  if (checked !== true) return;
                  copyMandateToBilling();
                }}
              />
              <FieldLabel htmlFor="billingSameAsMandate" className="font-normal">
                Copia i dati del mandante
              </FieldLabel>
            </div>
            <FieldDescription>
              Nome, codice fiscale e telefono. L&apos;indirizzo di fatturazione
              non è fra i dati del mandante: va scritto qui.
            </FieldDescription>
          </FieldRoot>
          <Field
            name="billingName"
            label={FIELD_LABELS.billingName}
            className="sm:col-span-2"
            defaultValue={val("billingName")}
            error={err("billingName")}
            hint="Nome e cognome, o ragione sociale"
          />
          <Field
            name="billingAddress"
            label={FIELD_LABELS.billingAddress}
            defaultValue={val("billingAddress")}
            error={err("billingAddress")}
          />
          <Field
            name="billingStreetNumber"
            label={FIELD_LABELS.billingStreetNumber}
            defaultValue={val("billingStreetNumber")}
            error={err("billingStreetNumber")}
          />
          <Field
            name="billingPostalCode"
            label={FIELD_LABELS.billingPostalCode}
            defaultValue={val("billingPostalCode")}
            error={err("billingPostalCode")}
            maxLength={5}
          />
          <ComuneField
            name="billingCity"
            label={FIELD_LABELS.billingCity}
            defaultValue={val("billingCity")}
            error={err("billingCity")}
          />
          <Field
            name="billingTaxCode"
            label={FIELD_LABELS.billingTaxCode}
            defaultValue={val("billingTaxCode")}
            error={err("billingTaxCode")}
            inputClassName="uppercase"
            hint="16 caratteri, o 11 cifre per una società"
          />
          <Field
            name="billingPhone"
            label={FIELD_LABELS.billingPhone}
            type="tel"
            defaultValue={val("billingPhone")}
            error={err("billingPhone")}
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
