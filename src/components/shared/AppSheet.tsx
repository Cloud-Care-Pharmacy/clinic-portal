"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  showCloseButton?: boolean;
}

export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
  footerClassName,
  showCloseButton = true,
}: AppSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={showCloseButton}
        className={cn(
          "h-dvh max-h-dvh w-full! overflow-hidden bg-card p-0 sm:w-130! sm:max-w-130!",
          className
        )}
      >
        <SheetHeader className="shrink-0 border-b border-border px-6 py-5 pr-14 text-left">
          <SheetTitle className="text-base font-semibold text-foreground">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="text-[13px] leading-5 text-muted-foreground">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm leading-[1.55]",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              "flex shrink-0 flex-col gap-2 border-t border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-end",
              footerClassName
            )}
          >
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
