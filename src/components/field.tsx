import {
  Field as FieldRoot,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Labelled text field built on shadcn's `ui/field` primitives: `data-invalid`
 * on the group colours label and border together, so that does not have to be
 * handled field by field.
 *
 * The value lives in the DOM and is collected by the FormData on submit;
 * errors come from server-side validation.
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
   * Classes for the input alone. `className` styles the whole group: using it
   * for `uppercase` would transform the label and description too.
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
