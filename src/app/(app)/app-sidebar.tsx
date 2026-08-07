"use client";

import { FileTextIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { href: "/pratiche", label: "Pratiche", icon: FileTextIcon },
  { href: "/impostazioni", label: "Impostazioni", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

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
                    // Anche le sottopagine contano: aprendo /pratiche/12 la
                    // voce "Pratiche" deve restare evidenziata.
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
            {/* Il logout cancella il cookie lato server: deve restare un
                invio di form, non un link. */}
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
