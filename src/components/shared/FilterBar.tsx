"use client";

import { Search, X, CirclePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterDefinition {
  /** Unique key for this filter group */
  key: string;
  /** Label shown on the trigger pill */
  label: string;
  /** Available options */
  options: string[];
  /** Currently active values */
  value: string[];
  /** Called when the selection changes */
  onChange: (value: string[]) => void;
  /** Optional label formatter */
  formatOption?: (option: string) => string;
}

interface FilterBarProps {
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Current search query */
  searchQuery: string;
  /** Called when search query changes */
  onSearchChange: (value: string) => void;
  /** Filter group definitions */
  filters?: FilterDefinition[];
  /** Right-side content (buttons, view toggle, etc.) */
  trailing?: React.ReactNode;
  /** Result count to display */
  resultCount?: number;
  /** Result count label (default: "results") */
  resultLabel?: string;
}

export function FilterBar({
  searchPlaceholder = "Search…",
  searchQuery,
  onSearchChange,
  filters = [],
  trailing,
  resultCount,
  resultLabel = "results",
}: FilterBarProps) {
  const activeCount = filters.reduce((sum, f) => sum + f.value.length, 0);

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-[250px] pl-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        {filters.map((filter) => (
          <FilterPill key={filter.key} filter={filter} />
        ))}

        {/* Active filter count + clear all */}
        {activeCount > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => filters.forEach((f) => f.onChange([]))}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {resultCount !== undefined && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {resultCount} {resultLabel}
          </span>
        )}
        {trailing}
      </div>
    </div>
  );
}

function FilterPill({ filter }: { filter: FilterDefinition }) {
  const { label, options, value, onChange, formatOption } = filter;
  const fmt = formatOption ?? ((o: string) => o);

  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-sm font-medium transition-colors hover:bg-accent",
          value.length > 0 ? "border-primary/50 bg-primary/5" : "border-border"
        )}
      >
        <CirclePlus className="size-4 text-muted-foreground" />
        {label}
        {value.length > 0 && (
          <Badge
            variant="outline"
            className="ml-1 rounded-md px-1.5 py-0 text-xs font-normal bg-primary/10 border-primary/20"
          >
            {value.length}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-[220px]">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={value.includes(option)}
            onClick={() => toggle(option)}
          >
            <span className="capitalize">{fmt(option)}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {value.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange([])}>
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
