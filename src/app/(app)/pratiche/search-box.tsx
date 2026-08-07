"use client";

import { SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * Ricerca sull'elenco. Aggiorna la query string, cosi' il risultato resta in
 * cronologia e si puo' condividere o ricaricare.
 */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => {
    // Al primo render lo stato coincide gia' con l'URL: navigare qui
    // rimpiazzerebbe la voce di cronologia senza motivo.
    if (first.current) {
      first.current = false;
      return;
    }

    // Attesa breve: senza, ogni tasto premuto sarebbe una query al database.
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      router.replace(`/pratiche?${next}`);
    }, 250);

    return () => clearTimeout(timer);
  }, [value, params, router]);

  return (
    <InputGroup className="max-w-md">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        id="q"
        type="search"
        aria-label="Cerca fra le pratiche"
        placeholder="Cerca per cognome, nome, codice fiscale, comune…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </InputGroup>
  );
}
