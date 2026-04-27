"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  ClipboardCheck,
  Shield,
  LogOut,
  Menu,
  ChevronsUpDown,
  Pill,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarState } from "@/components/providers/SidebarProvider";
import type { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles?: UserRole[];
}

const generalNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Patients",
    href: "/patients",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    label: "Prescriptions",
    href: "/prescriptions",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "Consultations",
    href: "/consultations",
    icon: <Calendar className="h-5 w-5" />,
  },
];

const adminNav: NavItem[] = [
  {
    label: "Admin",
    href: "/admin",
    icon: <Shield className="h-5 w-5" />,
    roles: ["admin"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: <User className="h-5 w-5" />,
  },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
  };
}

const sidebarTransition = "duration-200 ease-out motion-reduce:transition-none";

function RevealText({
  collapsed,
  children,
  className,
}: {
  collapsed: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform]",
        sidebarTransition,
        collapsed
          ? "max-w-0 -translate-x-1 opacity-0"
          : "max-w-44 translate-x-0 opacity-100",
        className
      )}
    >
      {children}
    </span>
  );
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={cn(
        "my-1.5 flex items-center rounded-lg py-2.5 text-sm transition-all",
        sidebarTransition,
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        collapsed ? "mx-1 gap-0 px-5" : "mx-3 gap-4 px-4"
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        {item.icon}
      </span>
      <RevealText collapsed={collapsed}>{item.label}</RevealText>
    </Link>
  );
}

function NavGroup({
  title,
  items,
  collapsed,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p
        className={cn(
          "overflow-hidden px-5 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40 transition-all",
          sidebarTransition,
          collapsed
            ? "max-h-0 -translate-x-1 pb-0 opacity-0"
            : "max-h-6 translate-x-0 pb-2 opacity-100"
        )}
      >
        {title}
      </p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

function SidebarContent({ user, collapsed }: SidebarProps & { collapsed: boolean }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const filteredAdmin = adminNav.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  const initials = (user.name ?? user.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Team / App Header */}
      <div
        className={cn(
          "flex items-center gap-3 overflow-hidden px-4 py-4 transition-all",
          sidebarTransition
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Pill className="h-4 w-4" />
        </div>
        <div
          className={cn(
            "grid min-w-0 flex-1 overflow-hidden text-sm leading-tight transition-[max-width,opacity,transform]",
            sidebarTransition,
            collapsed
              ? "max-w-0 -translate-x-1 opacity-0"
              : "max-w-40 translate-x-0 opacity-100"
          )}
        >
          <span className="truncate font-semibold">Quity</span>
          <span className="truncate text-xs text-sidebar-foreground/50">
            Clinic Portal
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 py-4">
        <NavGroup title="General" items={generalNav} collapsed={collapsed} />
        {filteredAdmin.length > 0 && (
          <NavGroup title="Management" items={filteredAdmin} collapsed={collapsed} />
        )}
      </nav>

      {/* User profile */}
      <div
        className={cn(
          "py-3 transition-[padding]",
          sidebarTransition,
          collapsed ? "px-2" : "px-3"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex w-full items-center rounded-md p-2 text-sm transition-all hover:bg-sidebar-accent/50",
              sidebarTransition,
              collapsed ? "gap-0" : "gap-3"
            )}
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "grid min-w-0 flex-1 overflow-hidden text-start text-sm leading-tight transition-[max-width,opacity,transform]",
                sidebarTransition,
                collapsed
                  ? "max-w-0 -translate-x-1 opacity-0"
                  : "max-w-40 translate-x-0 opacity-100"
              )}
            >
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/50">
                {user.email}
              </span>
            </div>
            <ChevronsUpDown
              className={cn(
                "h-4 shrink-0 text-sidebar-foreground/50 transition-all",
                sidebarTransition,
                collapsed
                  ? "ml-0 w-0 translate-x-1 opacity-0"
                  : "ml-auto w-4 translate-x-0 opacity-100"
              )}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const { collapsed } = useSidebarState();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        data-collapsed={collapsed}
        className={cn(
          "hidden shrink-0 overflow-hidden bg-sidebar transition-[width] will-change-[width] lg:flex lg:flex-col",
          sidebarTransition,
          collapsed ? "w-17" : "w-64"
        )}
      >
        <SidebarContent user={user} collapsed={collapsed} />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet>
        <SheetTrigger className="lg:hidden fixed top-3 left-3 z-40 inline-flex items-center justify-center rounded-lg p-2 hover:bg-accent">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent user={user} collapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}
