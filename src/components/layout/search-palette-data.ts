import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  Command,
  Grid3X3,
  History,
  Pill,
  Plus,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

export type SearchScope = "all" | "patients" | "actions" | "recent";
export type QuickFilterTone = "danger" | "info" | "accent" | "warning";
export type CommandGroup = "Actions" | "Navigate";

export interface SearchScopeDefinition {
  id: SearchScope;
  label: string;
  icon?: LucideIcon;
}

export interface SearchCommandDefinition {
  id: string;
  label: string;
  group: CommandGroup;
  icon: LucideIcon;
  href: string;
  shortcut?: string[];
  keywords?: string[];
}

export interface QuickFilterDefinition {
  id: string;
  label: string;
  tone: QuickFilterTone;
  icon: LucideIcon;
  href: string;
  count?: number;
}

export const SEARCH_SCOPES: SearchScopeDefinition[] = [
  { id: "all", label: "All" },
  { id: "patients", label: "Patients", icon: Users },
  { id: "actions", label: "Actions", icon: Command },
  { id: "recent", label: "Recent", icon: History },
];

export const SEARCH_COMMANDS: SearchCommandDefinition[] = [
  {
    id: "new-patient",
    label: "Add new patient",
    group: "Actions",
    icon: Plus,
    href: "/patients/new",
    shortcut: ["N"],
    keywords: ["create", "intake", "patient"],
  },
  {
    id: "new-consultation",
    label: "Start new consultation",
    group: "Actions",
    icon: Stethoscope,
    href: "/consultations",
    shortcut: ["C"],
    keywords: ["book", "appointment", "consult"],
  },
  {
    id: "new-prescription",
    label: "Write prescription",
    group: "Actions",
    icon: Pill,
    href: "/prescriptions",
    shortcut: ["P"],
    keywords: ["rx", "medication", "script"],
  },
  {
    id: "new-task",
    label: "Create task",
    group: "Actions",
    icon: CheckSquare,
    href: "/tasks",
    shortcut: ["T"],
    keywords: ["todo", "follow up", "work queue"],
  },
  {
    id: "go-dashboard",
    label: "Go to Dashboard",
    group: "Navigate",
    icon: Grid3X3,
    href: "/dashboard",
    keywords: ["home", "overview"],
  },
  {
    id: "go-patients",
    label: "Go to Patients",
    group: "Navigate",
    icon: Users,
    href: "/patients",
    keywords: ["people", "records"],
  },
  {
    id: "go-consultations",
    label: "Go to Consultations",
    group: "Navigate",
    icon: Stethoscope,
    href: "/consultations",
    keywords: ["appointments", "calendar"],
  },
  {
    id: "go-prescriptions",
    label: "Go to Prescriptions",
    group: "Navigate",
    icon: Pill,
    href: "/prescriptions",
    keywords: ["rx", "medications", "scripts"],
  },
  {
    id: "go-tasks",
    label: "Go to Tasks",
    group: "Navigate",
    icon: CheckSquare,
    href: "/tasks",
    keywords: ["queue", "work", "follow up"],
  },
  {
    id: "go-admin",
    label: "Go to Administration",
    group: "Navigate",
    icon: Settings,
    href: "/admin",
    keywords: ["users", "staff", "settings"],
  },
];

export const QUICK_FILTERS: QuickFilterDefinition[] = [
  {
    id: "doctor-review",
    label: "Doctor review required",
    tone: "danger",
    icon: AlertTriangle,
    href: "/tasks",
  },
  {
    id: "today-appointments",
    label: "Today's appointments",
    tone: "info",
    icon: CalendarDays,
    href: "/consultations",
  },
  {
    id: "new-this-week",
    label: "New this week",
    tone: "accent",
    icon: Sparkles,
    href: "/patients",
  },
  {
    id: "open-tasks",
    label: "Open tasks",
    tone: "warning",
    icon: CheckSquare,
    href: "/tasks",
  },
];

export const NO_RESULTS_ACTIONS = {
  addPatient: {
    label: "Add new patient",
    icon: Plus,
    href: "/patients/new",
  },
  advancedSearch: {
    label: "Advanced search",
    icon: Search,
    href: "/patients",
  },
};
