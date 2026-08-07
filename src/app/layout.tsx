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
    // Geist arriva dal pacchetto npm, non da Google: i file sono gia' su disco
    // e il build nel container funziona senza rete.
    //
    // `dark` fissa sul root: il tema e' scuro sempre, non segue le preferenze
    // di sistema. `color-scheme` fa adeguare anche i controlli nativi del
    // browser — selettori di data e ora, barre di scorrimento — che altrimenti
    // resterebbero chiari in mezzo al resto.
    <html
      lang="it"
      className={`dark h-full antialiased ${GeistSans.variable} ${GeistMono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      {/* Niente flex-col qui: SidebarProvider dispone da se' barra e contenuto
          affiancati, e un contenitore a colonna la lascerebbe alta quanto le
          sue voci invece che quanto la pagina. */}
      <body className="min-h-full">
        {/* Richiesto dalla sidebar, che mostra i nomi delle voci come tooltip
            quando e' compressa a sole icone. */}
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
