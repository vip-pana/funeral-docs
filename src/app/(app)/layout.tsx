import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";

/**
 * Guscio delle pagine autenticate. L'accesso e' gia' garantito dal middleware:
 * qui c'e' solo la navigazione.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Lo stato aperto/chiuso della sidebar sta in un cookie: leggerlo lato
  // server evita che la barra compaia aperta per un istante prima di
  // richiudersi al primo render nel browser.
  const store = await cookies();
  const defaultOpen = store.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
