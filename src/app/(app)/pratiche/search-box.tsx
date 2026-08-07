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
 * Drives the query string rather than local state, so a result stays in
 * history and can be shared or reloaded.
 */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const first = useRef(true);

  useEffect(() => {
    // On the first render the state already matches the URL: navigating here
    // would replace the history entry for nothing.
    if (first.current) {
      first.current = false;
      return;
    }

    // Debounce: without it every keystroke would be a database query.
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
