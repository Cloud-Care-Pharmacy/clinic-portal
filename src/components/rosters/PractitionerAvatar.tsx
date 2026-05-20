"use client";

import { cn } from "@/lib/utils";
import { getPractitionerTint, getPractitionerInitials } from "@/lib/rosters-utils";

interface PractitionerAvatarProps {
  practitionerId: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "size-7  text-[11px]",
  md: "size-9  text-[13px]",
  lg: "size-11  text-[15px]",
};

export function PractitionerAvatar({
  practitionerId,
  name,
  size = "md",
  className,
}: PractitionerAvatarProps) {
  const tint = getPractitionerTint(practitionerId);
  const initials = getPractitionerInitials(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid place-items-center rounded-sm font-semibold text-white",
        sizeMap[size],
        className
      )}
      style={{ background: tint }}
    >
      {initials}
    </span>
  );
}
