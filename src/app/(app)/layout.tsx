import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "./app-sidebar";

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
