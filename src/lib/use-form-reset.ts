"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Keeps what the user chose when a server action comes back with errors.
 *
 * React resets the form after every action passed to `<form action>`, which is
 * right after a save but wrong after a rejected one: uncontrolled fields go
 * blank, and Radix's Select and Checkbox listen for that same `reset` event and
 * jump back to their initial value — an already chosen client emptying itself,
 * a sex silently going back to male.
 *
 * The form's own `reset()` is replaced rather than the event cancelled with
 * `onReset`: Radix reacts to the event itself, so by the time React's handler
 * runs the value is already gone. Resets are dropped by default and only go
 * through when the form asks for one itself, via the returned `reset`.
 */
export function useFormReset<T extends HTMLFormElement = HTMLFormElement>() {
  const ref = useRef<T>(null);
  const allowed = useRef(false);

  useEffect(() => {
    const form = ref.current;
    if (!form) return;

    const native = form.reset.bind(form);
    form.reset = () => {
      if (allowed.current) native();
    };
    return () => {
      // `delete` rather than reassigning: the method belongs to the prototype,
      // and putting a copy on the instance would keep the patch alive.
      delete (form as Partial<HTMLFormElement>).reset;
    };
  }, []);

  /** Empties the form on purpose — after a successful save, typically. */
  const reset = useCallback(() => {
    allowed.current = true;
    ref.current?.reset();
    allowed.current = false;
  }, []);

  return { ref, reset };
}
