import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar, SectionTitle } from "./app-sidebar";

/** Access is already enforced by the middleware; this is just navigation. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // The sidebar open/closed state lives in a cookie: reading it server-side
  // stops the bar from flashing open before collapsing on the first client
  // render.
  const store = await cookies();
  const defaultOpen = store.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        {/* Pinned on phones, where pages are long and the menu is the only
            way elsewhere. */}
        <header className="bg-background/90 supports-backdrop-filter:backdrop-blur sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:h-14 sm:px-4 md:static">
          <SidebarTrigger className="size-9" />
          <SectionTitle />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
