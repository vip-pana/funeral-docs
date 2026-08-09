import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
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
    // ThemeProvider writes `dark` and `color-scheme` on this tag before paint,
    // so the class is no longer pinned here — hence `suppressHydrationWarning`,
    // which stops React from flagging the attributes that script adds.
    <html
      lang="it"
      suppressHydrationWarning
      className={`h-full antialiased ${GeistSans.variable} ${GeistMono.variable}`}
    >
      {/* No flex-col here: SidebarProvider lays the bar and the content out
          side by side on its own, and a column container would leave the bar
          as tall as its entries instead of the page. */}
      <body className="min-h-full">
        {/* Dark stays the default for whoever has never picked a theme, as the
            app was before the switch existed. No "system" option: the sidebar
            switch only knows light and dark. `enableColorScheme` (on by
            default) is what keeps native controls — date and time pickers,
            scrollbars — from staying light against a dark page. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Required by the sidebar, which shows entry names as tooltips when
              collapsed to icons only. */}
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
