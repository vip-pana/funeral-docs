"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Field as FieldRoot,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Comune } from "@/lib/comuni";
import { cn } from "@/lib/utils";

/**
 * Selezione di un comune, con ricerca.
 *
 * L'elenco completo sta sul server (~200 KB): i risultati arrivano da
 * `/api/comuni` mentre si digita. Il campo resta libero — un comune non in
 * elenco si conferma comunque, perche' rifiutarlo bloccherebbe il lavoro per
 * un dato che l'app non conosce.
 *
 * Il valore viaggia in un input nascosto: il pulsante del popover non fa parte
 * della FormData.
 */
export function ComuneField({
  name,
  label,
  defaultValue,
  value: controlled,
  onChange,
  error,
  hint,
  onPick,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  /** Passare value+onChange per pilotare il campo dall'esterno. */
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  /** Chiamato quando viene scelto un comune dell'elenco. */
  onPick?: (comune: Comune) => void;
}) {
  // L'id coincide col nome del campo: la <label> punta a un elemento
  // prevedibile e il pulsante resta indirizzabile dall'esterno.
  const id = name;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Comune[]>([]);
  const [loading, setLoading] = useState(false);

  // Controllato se il genitore fornisce un valore, altrimenti autonomo.
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v);
    onChange?.(v);
  };

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setOptions([]);
      return;
    }

    setLoading(true);
    // Attesa breve: senza, ogni tasto premuto sarebbe una richiesta.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/comuni?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) setOptions(await res.json());
      } catch {
        // Richiesta annullata o rete assente: si puo' comunque digitare.
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  function pick(comune: Comune) {
    setValue(comune.nome);
    onPick?.(comune);
    setOpen(false);
    setQuery("");
  }

  /** Conferma il testo digitato anche se non corrisponde a nessun comune. */
  function acceptTyped() {
    const typed = query.trim();
    if (!typed) return;
    setValue(typed);
    setOpen(false);
    setQuery("");
  }

  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <FieldRoot data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      {/* Il valore vero per la FormData: il trigger e' un <button>, e i
          pulsanti non entrano nell'invio del form. */}
      <input type="hidden" name={name} value={value} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || "Seleziona…"}
            </span>
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
        >
          {/* I risultati arrivano gia' filtrati dal server: il filtro interno
              di cmdk li scarterebbe una seconda volta. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Cerca un comune…"
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                // Invio senza risultati: si tiene quello che e' stato scritto.
                if (e.key === "Enter" && options.length === 0) {
                  e.preventDefault();
                  acceptTyped();
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {query.trim().length < 2
                  ? "Scrivi almeno due lettere."
                  : loading
                    ? "Ricerca…"
                    : "Nessun comune trovato. Premi Invio per usare il testo scritto."}
              </CommandEmpty>
              <CommandGroup>
                {options.map((c) => (
                  <CommandItem
                    key={c.codice}
                    value={c.nome}
                    onSelect={() => pick(c)}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 size-4",
                        value === c.nome ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 truncate">{c.nome}</span>
                    <span className="text-muted-foreground text-xs">
                      {c.provincia}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {hint && !error && (
        <FieldDescription id={hintId}>{hint}</FieldDescription>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldRoot>
  );
}
