"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bell, FileText } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePractitioner } from "@/lib/hooks/use-practitioner";
import { useProfile } from "@/lib/hooks/use-profile";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function NotificationsBell() {
  const { user: clerkUser } = useUser();
  const { data: profileData } = useProfile();
  const { data: practitionerData } = usePractitioner();

  const role: UserRole =
    profileData?.data?.profile?.role ??
    (clerkUser?.publicMetadata?.role as UserRole | undefined) ??
    "staff";
  const canPrescribe = role === "practitioner" || role === "admin";
  const practitioner = practitionerData?.data?.practitioner ?? null;

  const actionItems = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];
    if (canPrescribe) {
      const prescriberComplete = Boolean(
        practitioner?.specialty?.trim() &&
          practitioner?.prescriberNumber?.trim() &&
          practitioner?.ahpraNumber?.trim()
      );
      if (!prescriberComplete) {
        const missing: string[] = [];
        if (!practitioner?.specialty?.trim()) missing.push("specialty");
        if (!practitioner?.prescriberNumber?.trim())
          missing.push("prescriber number");
        if (!practitioner?.ahpraNumber?.trim()) missing.push("AHPRA number");
        items.push({
          id: "prescriber-profile",
          title: "Complete your prescriber profile",
          description: `Add your ${missing.join(", ")} to unlock availability and start prescribing.`,
          href: "/profile",
          icon: FileText,
        });
      }
    }
    return items;
  }, [canPrescribe, practitioner]);

  const count = actionItems.length;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "relative inline-flex size-9  items-center justify-center rounded-sm border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
        aria-label={
          count > 0
            ? `Notifications, ${count} action item${count === 1 ? "" : "s"}`
            : "Notifications"
        }
      >
        <Bell className="size-4" aria-hidden="true" />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-danger-fg px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background"
            aria-hidden="true"
          >
            {count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {count > 0 && (
            <span className="text-xs text-muted-foreground">
              {count} action item{count === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {count === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {actionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 p-3  transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-status-warning-bg text-status-warning-fg">
                        <Icon className="size-4" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium leading-snug">
                          {item.title}
                        </span>
                        <span className="text-xs leading-snug text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
