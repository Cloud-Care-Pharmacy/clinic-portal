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
  sm: "size-7  text-[11px]",
  md: "size-9  text-[13px]",
  lg: "size-11  text-[15px]",
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
