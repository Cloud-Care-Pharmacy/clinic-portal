"use client";

import { cn } from "@/lib/utils";
import { getDoctorTint, getDoctorInitials } from "@/lib/rosters-utils";

interface DoctorAvatarProps {
  doctorId: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-11 w-11 text-[15px]",
};

export function DoctorAvatar({
  doctorId,
  name,
  size = "md",
  className,
}: DoctorAvatarProps) {
  const tint = getDoctorTint(doctorId);
  const initials = getDoctorInitials(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid place-items-center rounded-[10px] font-semibold text-white",
        sizeMap[size],
        className
      )}
      style={{ background: tint }}
    >
      {initials}
    </span>
  );
}
