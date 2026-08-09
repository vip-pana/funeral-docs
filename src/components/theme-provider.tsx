"use client";

// The root layout is a server component, so next-themes — which needs client
// state and localStorage — can only be mounted through this wrapper.
export { ThemeProvider } from "next-themes";
