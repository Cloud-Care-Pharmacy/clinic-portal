"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSidebarState } from "@/components/providers/SidebarProvider";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/patients/new": "New Patient",
  "/prescriptions": "Prescriptions",
  "/consultations": "Consultations",
  "/admin": "Administration",
  "/profile": "My Profile",
};

export function Header() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarState();
  const { overrides } = useBreadcrumbOverrides();

  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = overrides[href] ?? routeTitles[href] ?? seg.replace(/-/g, " ");
    return { label, href };
  });

  return (
    <header className="z-50 h-14">
      <div className="flex h-full items-center gap-3 px-4">
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          className="hidden lg:inline-flex h-8 w-8"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
        <div className="h-4 w-px shrink-0 bg-border" />
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground transition-colors capitalize"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium capitalize">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search..." className="w-64 pl-8 h-9" />
          </div>
        </div>
      </div>
    </header>
  );
}
