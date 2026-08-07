import {
  Field as FieldRoot,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Campo di testo etichettato, costruito sulle primitive `ui/field` di shadcn:
 * `data-invalid` sul gruppo colora etichetta e bordo insieme, senza doverlo
 * gestire campo per campo.
 *
 * Il valore vive nel DOM e viene raccolto dalla FormData al submit; gli errori
 * arrivano dalla validazione lato server.
 */
export function Field({
  name,
  label,
  error,
  hint,
  className,
  inputClassName,
  ...props
}: React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  /**
   * Classi per il solo campo di testo. `className` veste il gruppo: usarlo per
   * `uppercase` trasformerebbe anche etichetta e descrizione.
   */
  inputClassName?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;

  return (
    <FieldRoot data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        className={inputClassName}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && !error && (
        <FieldDescription id={hintId}>{hint}</FieldDescription>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </FieldRoot>
  );
}
