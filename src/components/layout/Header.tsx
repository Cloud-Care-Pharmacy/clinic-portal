"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/patients/new": "New Patient",
  "/prescriptions": "Prescriptions",
  "/consultations": "Consultations",
  "/admin": "Administration",
};

export function Header() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const title =
    routeTitles[pathname] ??
    (segments.length > 1 ? "Patient Detail" : "Dashboard");

  const breadcrumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = routeTitles[href] ?? seg.replace(/-/g, " ");
    return { label, href };
  });

  return (
    <header className="border-b bg-white px-6 py-4 lg:pl-6 pl-14">
      {breadcrumbs.length > 1 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
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
                <span className="text-foreground capitalize">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
    </header>
  );
}
