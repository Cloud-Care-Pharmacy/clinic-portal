"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSidebarState } from "@/components/providers/SidebarProvider";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/patients/new": "New Patient",
  "/tasks": "Tasks",
  "/prescriptions": "Prescriptions",
  "/consultations": "Consultations",
  "/admin": "Administration",
  "/profile": "My Profile",
};

interface HeaderProps {
  onSearchOpen?: () => void;
}

export function Header({ onSearchOpen }: HeaderProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarState();
  const { overrides } = useBreadcrumbOverrides();

  const segments = pathname.split("/").filter(Boolean);

  // Prepend Dashboard as parent breadcrumb for all dashboard-area routes
  const rawBreadcrumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = overrides[href] ?? routeTitles[href] ?? seg.replace(/-/g, " ");
    return { label, href };
  });

  const breadcrumbs =
    segments[0] !== "dashboard"
      ? [{ label: "Dashboard", href: "/dashboard" }, ...rawBreadcrumbs]
      : rawBreadcrumbs;

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
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <ChevronRight size={14} className="text-muted-foreground" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors capitalize"
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
          <button
            type="button"
            onClick={onSearchOpen}
            className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:inline-flex"
            aria-label="Search patients with Command K or Control K"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1">Search patients…</span>
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}
