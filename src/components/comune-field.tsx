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
 * Searchable municipality picker.
 *
 * The full list stays on the server (~200 KB): results come from `/api/comuni`
 * while typing. The field stays free-form — a municipality not in the list can
 * still be confirmed, because rejecting it would block the work over data the
 * app happens not to know.
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
  /** Pass value+onChange to drive the field from the outside. */
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  /** Called when a municipality is picked from the list. */
  onPick?: (comune: Comune) => void;
}) {
  // The id matches the field name so the <label> points at a predictable
  // element and the button stays addressable from outside (tests included).
  const id = name;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Comune[]>([]);
  const [loading, setLoading] = useState(false);

  // Controlled when the parent supplies a value, self-managing otherwise.
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
    // Debounce: without it every keystroke would be a request.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/comuni?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) setOptions(await res.json());
      } catch {
        // Request aborted or network down: typing still works.
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

  /** Accepts the typed text even if it matches no municipality. */
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

      {/* The actual value for the FormData: the trigger is a <button>, and
          buttons are not part of a form submission. */}
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
          {/* Results arrive already filtered by the server: cmdk's own filter
              would discard them a second time. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Cerca un comune…"
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                // Enter with no results: keep whatever was typed.
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
