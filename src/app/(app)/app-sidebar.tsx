"use client";

import {
  FileTextIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  TruckIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { logout } from "@/app/login/actions";

const LINKS = [
  { href: "/deceased", label: "Defunti", icon: FileTextIcon },
  { href: "/clients", label: "Clienti", icon: UsersIcon },
  // Mezzi and personale: what the work is done with, not how the app is
  // configured — which is why they are no longer under Impostazioni.
  { href: "/resources", label: "Risorse", icon: TruckIcon },
  { href: "/settings", label: "Impostazioni", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-3">
        <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
          Documenti funebri
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {LINKS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    // Subpages count too: on /deceased/12 the "Defunti" entry
                    // must stay highlighted.
                    isActive={pathname === href || pathname.startsWith(`${href}/`)}
                    tooltip={label}
                  >
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Icon and label are swapped by the `dark:` variants rather than
                by React state: the theme is only known on the client, so
                rendering from it would either mismatch the server markup or
                make this entry pop in a frame late. */}
            <SidebarMenuButton
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              tooltip="Cambia tema"
            >
              <SunIcon className="hidden dark:block" />
              <MoonIcon className="dark:hidden" />
              <span className="hidden dark:inline">Tema chiaro</span>
              <span className="dark:hidden">Tema scuro</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            {/* Logout clears the cookie server-side, so this has to stay a
                form submission rather than a link. */}
            <form action={logout}>
              <SidebarMenuButton asChild tooltip="Esci">
                <button type="submit" className="w-full">
                  <LogOutIcon />
                  <span>Esci</span>
                </button>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
