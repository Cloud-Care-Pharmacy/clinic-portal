"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import type { ReactNode } from "react";

export type ViewMode = "week" | "month";

interface RosterCardProps {
  title: string;
  rangeLabel: string;
  stepLabel: string;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  children: ReactNode;
}

export function RosterCard({
  title,
  rangeLabel,
  stepLabel,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
  children,
}: RosterCardProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border bg-card"
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex flex-wrap items-center gap-3 border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="min-w-0">
          <div className="text-base font-semibold text-foreground">{title}</div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            {rangeLabel}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8 rounded-[10px]"
          >
            Today
          </Button>
          <div
            className="inline-flex items-center rounded-[10px] border bg-background p-0.5"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[152px] px-1 text-center text-[13px] font-medium tabular-nums">
              {stepLabel}
            </span>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <SegmentedControl<ViewMode>
            value={view}
            onChange={onView}
            size="sm"
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </div>
      </div>
      <div className={cn(view === "week" ? "" : "p-2")}>{children}</div>
    </div>
  );
}
