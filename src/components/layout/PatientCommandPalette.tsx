"use client";

import {
  ArrowUpRight,
  CalendarDays,
  Filter,
  Loader2,
  Mail,
  Phone,
  Search,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  NO_RESULTS_ACTIONS,
  QUICK_FILTERS,
  SEARCH_COMMANDS,
  SEARCH_SCOPES,
  type QuickFilterDefinition,
  type QuickFilterTone,
  type SearchCommandDefinition,
  type SearchScope,
} from "@/components/layout/search-palette-data";
import {
  formatDateOfBirth,
  getPatientAge,
  getPatientIdentifier,
  getPatientInitials,
  getPatientLabel,
  getRecentPatientsServerSnapshot,
  getRecentPatientsSnapshot,
  rememberRecentPatient,
  subscribeRecentPatients,
} from "@/components/layout/search-palette-utils";
import { usePatientSearch } from "@/lib/hooks/use-patients";
import { cn } from "@/lib/utils";
import type { PatientSearchResult } from "@/types";

const SEARCH_LIMIT = 20;
const ALL_SCOPE_PATIENT_LIMIT = 4;
const EMPTY_PATIENTS: PatientSearchResult[] = [];
const ACTION_COMMANDS = SEARCH_COMMANDS.filter(
  (command) => command.group === "Actions"
);

const quickFilterToneClasses: Record<QuickFilterTone, string> = {
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
  info: "border-status-info-border bg-status-info-bg text-status-info-fg",
  accent: "border-status-accent-border bg-status-accent-bg text-status-accent-fg",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
};

const avatarToneClasses = [
  "bg-status-accent-bg text-status-accent-fg border-status-accent-border",
  "bg-status-info-bg text-status-info-fg border-status-info-border",
  "bg-status-success-bg text-status-success-fg border-status-success-border",
  "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
  "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
  "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
];

type SearchItem =
  | {
      key: string;
      type: "patient";
      patient: PatientSearchResult;
      href: string;
    }
  | {
      key: string;
      type: "command";
      command: SearchCommandDefinition;
      href: string;
    };

interface PatientCommandPaletteProps {
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function patientHref(patient: PatientSearchResult) {
  return `/patients/${encodeURIComponent(patient.id)}`;
}

function commandMatchesQuery(command: SearchCommandDefinition, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [command.label, command.group, ...(command.keywords ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function patientMatchesQuery(patient: PatientSearchResult, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const digitQuery = q.replace(/\D/g, "");
  const text = [
    patient.id,
    patient.displayName,
    patient.originalEmail,
    patient.generatedEmail,
    patient.mobile,
    patient.pbsPatientId,
    patient.halaxyPatientId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const phoneDigits = (patient.mobile ?? "").replace(/\D/g, "");

  return text.includes(q) || (Boolean(digitQuery) && phoneDigits.includes(digitQuery));
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function PatientCommandPalette({
  entityId,
  open,
  onOpenChange,
}: PatientCommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [scope, setScope] = useState<SearchScope>("all");
  const currentQuery = query.trim();
  const deferredQuery = useDeferredValue(currentQuery);
  const hasQuery = currentQuery.length > 0;
  const isSettlingQuery = currentQuery !== deferredQuery;
  const canSearch = open && Boolean(entityId) && deferredQuery.length > 0;
  const search = usePatientSearch(canSearch ? entityId : undefined, {
    q: deferredQuery,
    limit: SEARCH_LIMIT,
  });
  const recentPatients = useSyncExternalStore(
    subscribeRecentPatients,
    getRecentPatientsSnapshot,
    getRecentPatientsServerSnapshot
  );
  const patients = search.data?.data?.patients ?? EMPTY_PATIENTS;
  const searchingPatients = canSearch && (isSettlingQuery || search.isFetching);
  const patientSearchScope = scope === "all" || scope === "patients";

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.repeat) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const commandMatches = useMemo(
    () =>
      hasQuery
        ? SEARCH_COMMANDS.filter((command) =>
            commandMatchesQuery(command, currentQuery)
          )
        : [],
    [currentQuery, hasQuery]
  );
  const recentMatches = useMemo(
    () =>
      hasQuery
        ? recentPatients.filter((patient) => patientMatchesQuery(patient, currentQuery))
        : recentPatients,
    [currentQuery, hasQuery, recentPatients]
  );

  const scopedPatients = useMemo(() => {
    if (!hasQuery) return scope === "recent" || scope === "all" ? recentPatients : [];
    if (scope === "recent") return recentMatches;
    if (scope === "actions") return [];
    return patients.slice(
      0,
      scope === "patients" ? SEARCH_LIMIT : ALL_SCOPE_PATIENT_LIMIT
    );
  }, [hasQuery, patients, recentMatches, recentPatients, scope]);
  const scopedCommands = useMemo(() => {
    if (!hasQuery) return scope === "actions" || scope === "all" ? ACTION_COMMANDS : [];
    if (scope === "patients" || scope === "recent") return [];
    return commandMatches;
  }, [commandMatches, hasQuery, scope]);

  const visibleItems = useMemo<SearchItem[]>(() => {
    const patientItems = scopedPatients.map((patient) => ({
      key: `patient:${patient.id}`,
      type: "patient" as const,
      patient,
      href: patientHref(patient),
    }));
    const commandItems = scopedCommands.map((command) => ({
      key: `command:${command.id}`,
      type: "command" as const,
      command,
      href: command.href,
    }));

    return [...patientItems, ...commandItems];
  }, [scopedCommands, scopedPatients]);
  const itemIndexByKey = useMemo(
    () => new Map(visibleItems.map((item, index) => [item.key, index])),
    [visibleItems]
  );
  const normalizedActiveIdx = visibleItems.length
    ? Math.min(activeIdx, visibleItems.length - 1)
    : -1;
  const activeItem =
    normalizedActiveIdx >= 0 ? visibleItems[normalizedActiveIdx] : undefined;
  const activeDescendant = activeItem ? `search-option-${activeItem.key}` : undefined;
  const exposesListbox =
    visibleItems.length > 0 && (hasQuery || scope === "actions" || scope === "recent");

  const counts = {
    all: patients.length + commandMatches.length,
    patients: patients.length,
    actions: commandMatches.length,
    recent: recentMatches.length,
  } satisfies Record<SearchScope, number>;

  function closePalette() {
    setQuery("");
    setScope("all");
    setActiveIdx(0);
    onOpenChange(false);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    closePalette();
  }

  function openHref(href: string, newTab: boolean) {
    if (newTab) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(href);
  }

  function activateItem(item: SearchItem | undefined, newTab = false) {
    if (!item) return;

    if (item.type === "patient") rememberRecentPatient(item.patient);
    closePalette();
    openHref(item.href, newTab);
  }

  function handlePaletteKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!visibleItems.length) return;
      setActiveIdx((index) => (index + 1) % visibleItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!visibleItems.length) return;
      setActiveIdx((index) => (index - 1 + visibleItems.length) % visibleItems.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateItem(activeItem, event.metaKey || event.ctrlKey);
    }
  }

  function handleScopeChange(nextScope: SearchScope) {
    setScope(nextScope);
    setActiveIdx(0);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIdx(0);
  }

  function goToHref(href: string) {
    closePalette();
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-foreground/45 supports-backdrop-filter:backdrop-blur-sm duration-150"
        className="max-h-[min(640px,calc(100vh-80px))] w-[min(720px,calc(100vw-48px))] max-w-none gap-0 overflow-hidden rounded-[18px] border border-border bg-popover p-0 shadow-2xl duration-200 sm:max-w-none"
        onKeyDown={handlePaletteKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Search patients, prescriptions, or jump to another area of the portal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-border px-4 py-4 focus-within:ring-3 focus-within:ring-ring/20">
          <Search
            className="size-4.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="Search patients, prescriptions, or jump to…"
            aria-label="Search patients, prescriptions, or navigation"
            aria-controls={listboxId}
            aria-activedescendant={exposesListbox ? activeDescendant : undefined}
            aria-autocomplete="list"
            className="h-6 border-0 bg-transparent px-0 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 md:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="grid size-5.5 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="Clear search"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <Kbd className="hidden sm:inline-grid">Esc</Kbd>
        </div>

        <div className="flex gap-1 border-b border-border bg-background px-3 py-2">
          {SEARCH_SCOPES.map((searchScope) => {
            const Icon = searchScope.icon;
            const active = scope === searchScope.id;
            return (
              <button
                key={searchScope.id}
                type="button"
                onClick={() => handleScopeChange(searchScope.id)}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active &&
                    "border border-border bg-popover text-foreground shadow-xs hover:bg-popover"
                )}
                aria-pressed={active}
              >
                {Icon && <Icon className="size-3.5" aria-hidden="true" />}
                <span>{searchScope.label}</span>
                {hasQuery && (
                  <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
                    {counts[searchScope.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          id={listboxId}
          role={exposesListbox ? "listbox" : undefined}
          aria-label="Search results"
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
        >
          {!entityId && hasQuery && scope !== "actions" ? (
            <CommandMessage
              icon={<User className="size-5" aria-hidden="true" />}
              title="Patient search is unavailable"
              body="No default pharmacy entity is configured for patient lookup."
            />
          ) : hasQuery ? (
            searchingPatients && patientSearchScope ? (
              <CommandMessage
                icon={<Loader2 className="size-5 animate-spin" aria-hidden="true" />}
                title="Searching patients…"
                body="Matching patients by name, email, phone number, and MRN."
              />
            ) : search.isError && patientSearchScope ? (
              <CommandMessage
                icon={<Search className="size-5" aria-hidden="true" />}
                title="Could not search patients"
                body={search.error.message || "Try again in a moment."}
              />
            ) : visibleItems.length === 0 ? (
              <NoResults query={currentQuery} onNavigate={goToHref} />
            ) : (
              <>
                {scopedPatients.length > 0 && (
                  <ResultsGroup
                    label={scope === "recent" ? "Recently viewed" : "Patients"}
                    meta={`${scopedPatients.length} match${scopedPatients.length === 1 ? "" : "es"}`}
                  >
                    {scopedPatients.map((patient) => {
                      const itemKey = `patient:${patient.id}`;
                      const index = itemIndexByKey.get(itemKey) ?? -1;
                      return (
                        <PatientResultRow
                          key={patient.id}
                          id={`search-option-${itemKey}`}
                          patient={patient}
                          query={currentQuery}
                          active={index === normalizedActiveIdx}
                          onActive={() => setActiveIdx(index)}
                          onSelect={() =>
                            activateItem({
                              key: itemKey,
                              type: "patient",
                              patient,
                              href: patientHref(patient),
                            })
                          }
                        />
                      );
                    })}
                  </ResultsGroup>
                )}
                {scopedCommands.length > 0 && (
                  <ResultsGroup
                    label="Actions & Navigation"
                    meta={`${scopedCommands.length} match${scopedCommands.length === 1 ? "" : "es"}`}
                  >
                    {scopedCommands.map((command) => {
                      const itemKey = `command:${command.id}`;
                      const index = itemIndexByKey.get(itemKey) ?? -1;
                      return (
                        <CommandResultRow
                          key={command.id}
                          id={`search-option-${itemKey}`}
                          command={command}
                          query={currentQuery}
                          active={index === normalizedActiveIdx}
                          onActive={() => setActiveIdx(index)}
                          onSelect={() =>
                            activateItem({
                              key: itemKey,
                              type: "command",
                              command,
                              href: command.href,
                            })
                          }
                        />
                      );
                    })}
                  </ResultsGroup>
                )}
              </>
            )
          ) : scope === "patients" ? (
            <CommandMessage
              icon={<Search className="size-5" aria-hidden="true" />}
              title="Start typing to search patients"
              body="Search by patient name, email address, phone number, or MRN."
            />
          ) : scope === "recent" ? (
            recentPatients.length > 0 ? (
              <ResultsGroup label="Recently viewed">
                {recentPatients.map((patient) => {
                  const itemKey = `patient:${patient.id}`;
                  const index = itemIndexByKey.get(itemKey) ?? -1;
                  return (
                    <PatientResultRow
                      key={patient.id}
                      id={`search-option-${itemKey}`}
                      patient={patient}
                      active={index === normalizedActiveIdx}
                      compact
                      onActive={() => setActiveIdx(index)}
                      onSelect={() =>
                        activateItem({
                          key: itemKey,
                          type: "patient",
                          patient,
                          href: patientHref(patient),
                        })
                      }
                    />
                  );
                })}
              </ResultsGroup>
            ) : (
              <CommandMessage
                icon={<User className="size-5" aria-hidden="true" />}
                title="No recent patients yet"
                body="Patients you open from search will appear here."
              />
            )
          ) : scope === "actions" ? (
            <QuickActions
              commands={ACTION_COMMANDS}
              normalizedActiveIdx={normalizedActiveIdx}
              itemIndexByKey={itemIndexByKey}
              onActive={setActiveIdx}
              onSelect={(command) =>
                activateItem({
                  key: `command:${command.id}`,
                  type: "command",
                  command,
                  href: command.href,
                })
              }
            />
          ) : (
            <EmptySearchState
              recentPatients={recentPatients}
              normalizedActiveIdx={normalizedActiveIdx}
              itemIndexByKey={itemIndexByKey}
              onActive={setActiveIdx}
              onSelectPatient={(patient) =>
                activateItem({
                  key: `patient:${patient.id}`,
                  type: "patient",
                  patient,
                  href: patientHref(patient),
                })
              }
              onSelectCommand={(command) =>
                activateItem({
                  key: `command:${command.id}`,
                  type: "command",
                  command,
                  href: command.href,
                })
              }
              onQuickFilter={(filter) => goToHref(filter.href)}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border bg-background px-4 py-2.5 text-[11px] text-muted-foreground">
          <div className="hidden items-center gap-3 sm:flex">
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span>navigate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd>
              <span>open</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
              <span>open in new tab</span>
            </span>
          </div>
          <div className="ml-auto inline-flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" aria-hidden="true" />
            <span>Smart search · names, emails, MRN, phone</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptySearchState({
  recentPatients,
  normalizedActiveIdx,
  itemIndexByKey,
  onActive,
  onSelectPatient,
  onSelectCommand,
  onQuickFilter,
}: {
  recentPatients: PatientSearchResult[];
  normalizedActiveIdx: number;
  itemIndexByKey: Map<string, number>;
  onActive: (index: number) => void;
  onSelectPatient: (patient: PatientSearchResult) => void;
  onSelectCommand: (command: SearchCommandDefinition) => void;
  onQuickFilter: (filter: QuickFilterDefinition) => void;
}) {
  return (
    <div>
      <div className="px-3 pb-1.5 pt-2.5">
        <SectionLabel>Quick filters</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((filter) => (
            <QuickFilterChip
              key={filter.id}
              filter={filter}
              onClick={() => onQuickFilter(filter)}
            />
          ))}
        </div>
      </div>

      <ResultsGroup label="Recently viewed" icon={User}>
        {recentPatients.length > 0 ? (
          recentPatients.slice(0, 3).map((patient) => {
            const itemKey = `patient:${patient.id}`;
            const index = itemIndexByKey.get(itemKey) ?? -1;
            return (
              <PatientResultRow
                key={patient.id}
                id={`search-option-${itemKey}`}
                patient={patient}
                active={index === normalizedActiveIdx}
                compact
                onActive={() => onActive(index)}
                onSelect={() => onSelectPatient(patient)}
              />
            );
          })
        ) : (
          <p className="mx-1 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
            Open a patient from search and they will appear here.
          </p>
        )}
      </ResultsGroup>

      <ResultsGroup label="Quick actions" icon={Search}>
        <QuickActions
          commands={ACTION_COMMANDS}
          normalizedActiveIdx={normalizedActiveIdx}
          itemIndexByKey={itemIndexByKey}
          onActive={onActive}
          onSelect={onSelectCommand}
        />
      </ResultsGroup>
    </div>
  );
}

function QuickFilterChip({
  filter,
  onClick,
}: {
  filter: QuickFilterDefinition;
  onClick: () => void;
}) {
  const Icon = filter.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        quickFilterToneClasses[filter.tone]
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span>{filter.label}</span>
      {filter.count !== undefined && (
        <span className="rounded-full bg-background/50 px-1.5 font-mono text-[10px] font-semibold tabular-nums">
          {filter.count}
        </span>
      )}
    </button>
  );
}

function QuickActions({
  commands,
  normalizedActiveIdx,
  itemIndexByKey,
  onActive,
  onSelect,
}: {
  commands: SearchCommandDefinition[];
  normalizedActiveIdx: number;
  itemIndexByKey: Map<string, number>;
  onActive: (index: number) => void;
  onSelect: (command: SearchCommandDefinition) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 px-1 sm:grid-cols-2 lg:grid-cols-4">
      {commands.map((command) => {
        const itemKey = `command:${command.id}`;
        const index = itemIndexByKey.get(itemKey) ?? -1;
        const Icon = command.icon;
        const active = index === normalizedActiveIdx;

        return (
          <button
            key={command.id}
            id={`search-option-${itemKey}`}
            type="button"
            role="option"
            aria-selected={active}
            onMouseEnter={() => onActive(index)}
            onFocus={() => onActive(index)}
            onClick={() => onSelect(command)}
            className={cn(
              "flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]"
            )}
            title={command.label}
          >
            <span className="grid size-5.5 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {command.label}
            </span>
            {command.shortcut?.[0] && (
              <Kbd className="ml-auto">{command.shortcut[0]}</Kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}

function NoResults({
  query,
  onNavigate,
}: {
  query: string;
  onNavigate: (href: string) => void;
}) {
  const AddIcon = NO_RESULTS_ACTIONS.addPatient.icon;
  const FilterIcon = Filter;

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3.5 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Search className="size-5" aria-hidden="true" />
      </div>
      <p className="text-[15px] font-semibold text-foreground">
        No matches for &quot;<span className="text-primary">{query}</span>&quot;
      </p>
      <p className="mb-4 mt-1 max-w-sm text-[13px] text-muted-foreground">
        We searched names, emails, phone numbers, and MRNs. Try a different spelling or
        fewer characters.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          size="lg"
          onClick={() => onNavigate(NO_RESULTS_ACTIONS.addPatient.href)}
        >
          <AddIcon className="size-3.5" aria-hidden="true" />
          {NO_RESULTS_ACTIONS.addPatient.label}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => onNavigate(NO_RESULTS_ACTIONS.advancedSearch.href)}
        >
          <FilterIcon className="size-3.5" aria-hidden="true" />
          {NO_RESULTS_ACTIONS.advancedSearch.label}
        </Button>
      </div>
    </div>
  );
}

function ResultsGroup({
  label,
  meta,
  icon: Icon,
  children,
}: {
  label: string;
  meta?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="py-2">
      <div className="flex items-center justify-between px-3 py-1.5">
        <SectionLabel>
          {Icon && <Icon className="size-3" aria-hidden="true" />}
          {label}
        </SectionLabel>
        {meta && (
          <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      {children}
    </span>
  );
}

function CommandMessage({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background px-6 py-8 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent p-0 font-bold text-primary underline decoration-primary/50 decoration-[1.5px] underline-offset-2">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

function PatientResultRow({
  id,
  patient,
  query,
  active,
  compact,
  onActive,
  onSelect,
}: {
  id: string;
  patient: PatientSearchResult;
  query?: string;
  active: boolean;
  compact?: boolean;
  onActive: () => void;
  onSelect: () => void;
}) {
  const label = getPatientLabel(patient);
  const age = getPatientAge(patient.dateOfBirth);
  const dob = formatDateOfBirth(patient.dateOfBirth);
  const identifier = getPatientIdentifier(patient);
  const details = [
    patient.originalEmail || patient.generatedEmail
      ? {
          icon: Mail,
          label: patient.originalEmail || patient.generatedEmail || "",
        }
      : null,
    patient.mobile ? { icon: Phone, label: patient.mobile } : null,
    dob ? { icon: CalendarDays, label: `DOB ${dob}` } : null,
  ].filter(Boolean) as { icon: LucideIcon; label: string }[];
  const visibleDetails = compact ? details.slice(-1) : details;
  const detailTitle = [...details.map((detail) => detail.label), identifier].join(
    " · "
  );
  const avatarClass =
    avatarToneClasses[hashString(patient.id) % avatarToneClasses.length];

  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onActive}
      onFocus={onActive}
      onClick={onSelect}
      aria-label={`Open patient profile for ${label}`}
      className={cn(
        "mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-100 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active &&
          "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)] hover:bg-primary/10"
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full border text-[13px] font-semibold",
          avatarClass
        )}
        aria-hidden="true"
      >
        {getPatientInitials(patient)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="truncate text-sm font-semibold text-foreground"
            title={label}
          >
            <Highlight text={label} query={query} />
          </span>
          {age !== null && (
            <span className="font-mono text-xs text-muted-foreground">{age}y</span>
          )}
        </span>
        <span
          className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          title={detailTitle}
        >
          {visibleDetails.map((detail) => {
            const Icon = detail.icon;
            return (
              <span
                key={detail.label}
                className="inline-flex min-w-0 items-center gap-1"
              >
                <Icon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  <Highlight text={detail.label} query={query} />
                </span>
              </span>
            );
          })}
          <span className="inline-flex min-w-0 items-center gap-1">
            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span className="truncate">{identifier}</span>
          </span>
        </span>
      </span>
      {!compact && (
        <span className="hidden shrink-0 text-right sm:block">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Patient ID
          </span>
          <span className="mt-0.5 block font-mono text-xs font-medium text-foreground">
            {patient.id.slice(0, 8)}
          </span>
        </span>
      )}
      <Kbd className={cn("shrink-0 opacity-0", active && "opacity-100")}>↵</Kbd>
    </button>
  );
}

function CommandResultRow({
  id,
  command,
  query,
  active,
  onActive,
  onSelect,
}: {
  id: string;
  command: SearchCommandDefinition;
  query: string;
  active: boolean;
  onActive: () => void;
  onSelect: () => void;
}) {
  const Icon = command.icon;

  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onActive}
      onFocus={onActive}
      onClick={onSelect}
      className={cn(
        "mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-100 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active &&
          "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)] hover:bg-primary/10"
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-medium text-foreground"
          title={command.label}
        >
          <Highlight text={command.label} query={query} />
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {command.group}
        </span>
      </span>
      {command.shortcut ? (
        <span className="flex gap-1">
          {command.shortcut.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </span>
      ) : (
        <ArrowUpRight
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
