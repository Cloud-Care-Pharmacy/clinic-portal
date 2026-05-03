"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpandableIconButton } from "@/components/shared/ExpandableIconButton";
import { useProfile } from "@/lib/hooks/use-profile";
import { usePractitioner } from "@/lib/hooks/use-practitioner";
import { Mail, Phone, User } from "lucide-react";
import { ProfileContactTab } from "@/components/profile/ProfileContactTab";
import { ProfileAvailabilityTab } from "@/components/profile/ProfileAvailabilityTab";
import { PrescriberDetailsSection } from "@/components/profile/PrescriberDetailsSection";
import { BusinessDetailsSection } from "@/components/profile/BusinessDetailsSection";
import { ProfileSecurityTab } from "@/components/profile/ProfileSecurityTab";
import type {
  PractitionerProfile,
  PractitionerProfileResponse,
  UserProfile,
  UserProfileResponse,
  UserRole,
} from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  staff: "Staff",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  doctor: "bg-status-info-bg text-status-info-fg border-status-info-border",
  staff: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
};

function computeCompleteness(
  profile: UserProfile | null,
  practitioner: PractitionerProfile | null,
  isDoctor: boolean
) {
  if (!profile) return { pct: 0, missing: 0 };
  const base = [profile.phone];
  const doctorFields = isDoctor
    ? [
        practitioner?.title,
        practitioner?.specialty,
        practitioner?.qualifications,
        practitioner?.prescriberNumber,
        practitioner?.ahpraNumber,
        practitioner?.providerNumber,
        practitioner?.hpii,
        practitioner?.business?.businessPhone,
        practitioner?.business?.businessEmail,
        practitioner?.business?.abn,
        practitioner?.business?.address?.streetName,
        practitioner?.business?.address?.suburb,
        practitioner?.business?.address?.state,
        practitioner?.business?.address?.postcode,
        practitioner?.availability ? "set" : null,
      ]
    : [];
  const all = [...base, ...doctorFields];
  const filled = all.filter((v) => v && String(v).trim().length > 0).length;
  const pct = Math.round((filled / all.length) * 100);
  return { pct, missing: all.length - filled };
}

interface ProfileInitialUser {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  imageUrl?: string;
  role: UserRole;
}

interface ProfileClientProps {
  initialProfile?: UserProfileResponse;
  initialPractitioner?: PractitionerProfileResponse;
  initialUser?: ProfileInitialUser;
}

export function ProfileClient({
  initialProfile,
  initialPractitioner,
  initialUser,
}: ProfileClientProps) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { data: profileData, isLoading: profileLoading } = useProfile(initialProfile);
  const { data: practitionerData, isLoading: practitionerLoading } =
    usePractitioner(initialPractitioner);

  const profile = profileData?.data?.profile ?? null;
  const practitioner = practitionerData?.data?.practitioner ?? null;
  const role =
    (clerkUser?.publicMetadata?.role as UserRole | undefined) ??
    initialUser?.role ??
    "staff";
  const isDoctor = role === "doctor";
  const canEditPractitioner = isDoctor || role === "admin";

  const firstName = clerkUser?.firstName ?? initialUser?.firstName ?? "";
  const lastName = clerkUser?.lastName ?? initialUser?.lastName ?? "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || initialUser?.fullName || "";
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? initialUser?.email ?? "";
  const imageUrl = clerkUser?.imageUrl ?? initialUser?.imageUrl;
  const phone = profile?.phone ?? "";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const { pct, missing } = useMemo(
    () => computeCompleteness(profile, practitioner, isDoctor),
    [profile, practitioner, isDoctor]
  );

  const isLoading =
    (!initialUser && !clerkLoaded) || profileLoading || practitionerLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="px-6 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card>
        <CardContent className="px-6 py-4">
          <div className="flex flex-col gap-3">
            {/* Row 1: avatar, name, role badge, contact icons */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={fullName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : initials ? (
                  initials
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <h2 className="text-lg font-semibold leading-tight whitespace-nowrap">
                {fullName}
              </h2>
              <Badge variant="outline" className={ROLE_COLORS[role]}>
                {ROLE_LABELS[role]}
              </Badge>
              <div className="flex items-center gap-1.5">
                <ExpandableIconButton
                  icon={<Mail className="size-4" />}
                  label={email}
                  ariaLabel={`Email: ${email}`}
                  disabled={!email}
                />
                <ExpandableIconButton
                  icon={<Phone className="size-4" />}
                  label={phone || "Not set"}
                  ariaLabel={`Phone: ${phone || "Not set"}`}
                  disabled={!phone}
                />
              </div>
            </div>

            {/* Row 2: specialty, prescriber #, joined */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {isDoctor && practitioner?.specialty && (
                <span>{practitioner.specialty}</span>
              )}
              {isDoctor && practitioner?.prescriberNumber && (
                <span className="font-mono text-xs">
                  Prescriber #{practitioner.prescriberNumber}
                </span>
              )}
              {profile?.createdAt && (
                <span className="text-xs">
                  Joined{" "}
                  {new Date(profile.createdAt).toLocaleDateString("en-AU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Row 3: Profile completeness */}
            <div className="flex items-center gap-3 border-t pt-3">
              <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                <strong className="text-foreground font-semibold">
                  Profile {pct}% complete
                </strong>
                {missing > 0 && (
                  <>
                    {" "}
                    &mdash; {missing} field{missing === 1 ? "" : "s"} missing
                  </>
                )}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="contact" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          {canEditPractitioner && (
            <TabsTrigger value="availability">Availability</TabsTrigger>
          )}
          {canEditPractitioner && (
            <TabsTrigger value="prescriber">Prescriber Details</TabsTrigger>
          )}
          {canEditPractitioner && (
            <TabsTrigger value="business">Business Details</TabsTrigger>
          )}
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <ProfileContactTab
            profile={profile}
            role={role}
            clerkFirstName={firstName}
            clerkLastName={lastName}
          />
        </TabsContent>

        {canEditPractitioner && (
          <TabsContent value="availability">
            <ProfileAvailabilityTab practitioner={practitioner} />
          </TabsContent>
        )}

        {canEditPractitioner && (
          <TabsContent value="prescriber">
            <PrescriberDetailsSection practitioner={practitioner} />
          </TabsContent>
        )}

        {canEditPractitioner && (
          <TabsContent value="business">
            <BusinessDetailsSection practitioner={practitioner} />
          </TabsContent>
        )}

        <TabsContent value="security">
          <ProfileSecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
