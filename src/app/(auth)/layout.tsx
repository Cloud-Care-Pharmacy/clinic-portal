import { Stethoscope, ShieldCheck, Lock, Server } from "lucide-react";

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3.5 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
      <span className="text-(--auth-accent)">{icon}</span>
      {label}
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="auth-brand-panel relative flex flex-col overflow-hidden px-8 py-10 text-white lg:px-16 lg:py-14">
        <div className="auth-glow-top" />
        <div className="auth-glow-bottom" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-(--auth-accent) shadow-[0_4px_14px_var(--auth-accent)/40]">
            <Stethoscope className="h-4 w-4 text-white" />
          </div>
          <span className="text-[17px] font-semibold">
            Quity <span className="text-(--auth-accent)">Clinic</span>
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 mt-auto pt-12">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">
            Patient Portal · Cloud Care Pharmacy
          </p>
          <h1 className="mb-5 max-w-130 text-3xl font-semibold leading-[1.1] tracking-tight lg:text-[44px]">
            Care that moves at the speed of your{" "}
            <em className="not-italic text-(--auth-accent)">practice</em>.
          </h1>
          <p className="max-w-115 text-base leading-relaxed text-white/70">
            Manage patients, prescriptions, and consultations in one place —
            purpose-built for prescribers and clinic staff.
          </p>

          <div className="mt-11 flex flex-wrap gap-2.5">
            <Badge
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="AHPRA compliant"
            />
            <Badge
              icon={<Lock className="h-3.5 w-3.5" />}
              label="End-to-end encrypted"
            />
            <Badge
              icon={<Server className="h-3.5 w-3.5" />}
              label="AU data residency"
            />
          </div>
        </div>
      </div>

      {/* Card panel */}
      <div className="relative grid flex-1 place-items-center bg-(--auth-card-bg) p-6 lg:p-10">
        <div className="auth-dot-pattern hidden lg:block" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
