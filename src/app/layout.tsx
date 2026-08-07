import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

export const metadata: Metadata = {
  title: "Documenti funebri",
  description: "Compilazione e stampa dei documenti per il trasporto funebre",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Geist comes from the npm package, not from Google: the files are already
    // on disk, so the container build works without network access.
    //
    // `dark` is pinned on the root — the theme is always dark and ignores
    // system preferences. `color-scheme` makes native browser controls (date
    // and time pickers, scrollbars) follow suit; they would otherwise stay
    // light against everything else.
    <html
      lang="it"
      className={`dark h-full antialiased ${GeistSans.variable} ${GeistMono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      {/* No flex-col here: SidebarProvider lays the bar and the content out
          side by side on its own, and a column container would leave the bar
          as tall as its entries instead of the page. */}
      <body className="min-h-full">
        {/* Required by the sidebar, which shows entry names as tooltips when
            collapsed to icons only. */}
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
