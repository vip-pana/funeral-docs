import * as React from "react"

const MOBILE_BREAKPOINT = 768

const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  // Read straight from matchMedia rather than mirroring it into state: an
  // effect that seeds the first value renders twice on every mount.
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // The server has no viewport, so it assumes desktop, as before.
    () => false,
  )
}
