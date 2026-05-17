/* oxlint-disable react-doctor/rendering-hydration-mismatch-time -- Locale-formatted timestamps are rendered with explicit "en-AU" locale; minor server/client timezone offset is acceptable for these display-only values. */
"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertBody, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpandableIconButton } from "@/components/shared/ExpandableIconButton";
import { useProfile } from "@/lib/hooks/use-profile";
import { usePractitioner } from "@/lib/hooks/use-practitioner";
import { Lock, Mail, Phone, User } from "lucide-react";
import { ProfileContactTab } from "@/components/profile/ProfileContactTab";
import { ProfileAvailabilityTab } from "@/components/profile/ProfileAvailabilityTab";
import { PrescriberDetailsSection } from "@/components/profile/PrescriberDetailsSection";
import { BusinessDetailsSection } from "@/components/profile/BusinessDetailsSection";
import { ProfileSecurityTab } from "@/components/profile/ProfileSecurityTab";
import type {
  PractitionerProfileResponse,
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
    profile?.role ??
    (clerkUser?.publicMetadata?.role as UserRole | undefined) ??
    initialUser?.role ??
    "staff";
  const isDoctor = role === "doctor";
  const canEditPractitioner = isDoctor || role === "admin";

  const firstName =
    profile?.firstName ?? clerkUser?.firstName ?? initialUser?.firstName ?? "";
  const lastName =
    profile?.lastName ?? clerkUser?.lastName ?? initialUser?.lastName ?? "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || initialUser?.fullName || "";
  const email =
    profile?.email ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    initialUser?.email ??
    "";
  const imageUrl = clerkUser?.imageUrl ?? initialUser?.imageUrl;
  const phone = profile?.phone ?? "";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Prescriber profile is "complete enough" to unlock availability when the
  // core identifying credentials needed to actually prescribe are present.
  const isPrescriberComplete = Boolean(
    practitioner?.specialty?.trim() &&
    practitioner?.prescriberNumber?.trim() &&
    practitioner?.ahpraNumber?.trim()
  );

  const [activeTab, setActiveTab] = useState("contact");

  const isLoading =
    (!initialUser && !clerkLoaded) || profileLoading || practitionerLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="px-6 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10  rounded-full" />
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
              <div className="flex size-10  shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={fullName}
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover"
                    unoptimized
                  />
                ) : initials ? (
                  initials
                ) : (
                  <User className="size-5 " />
                )}
              </div>
              <h2 className="text-lg font-semibold leading-tight whitespace-nowrap">
                {fullName}
              </h2>
              <Badge
                variant="outline"
                className={`${ROLE_COLORS[role]} h-9 rounded-full px-4 text-sm font-medium`}
              >
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
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          {canEditPractitioner && (
            <TabsTrigger value="prescriber">Prescriber Details</TabsTrigger>
          )}
          {canEditPractitioner && (
            <TabsTrigger value="business">Business Details</TabsTrigger>
          )}
          {canEditPractitioner && (
            <TabsTrigger
              value="availability"
              title={
                isPrescriberComplete
                  ? undefined
                  : "Complete your prescriber profile to unlock Availability"
              }
            >
              {!isPrescriberComplete && <Lock className="size-3.5" aria-hidden />}
              Availability
            </TabsTrigger>
          )}
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="contact">
          <ProfileContactTab profile={profile} />
        </TabsContent>

        {canEditPractitioner && (
          <TabsContent value="prescriber">
            {!isPrescriberComplete && (
              <Alert variant="info" className="mb-4">
                <AlertTitle>Complete your prescriber profile</AlertTitle>
                <AlertBody>
                  Add your specialty, prescriber number, and AHPRA number below to
                  unlock the Availability section.
                </AlertBody>
              </Alert>
            )}
            <PrescriberDetailsSection practitioner={practitioner} />
          </TabsContent>
        )}

        {canEditPractitioner && (
          <TabsContent value="business">
            <BusinessDetailsSection practitioner={practitioner} />
          </TabsContent>
        )}

        {canEditPractitioner && (
          <TabsContent value="availability">
            {isPrescriberComplete ? (
              <ProfileAvailabilityTab practitioner={practitioner} />
            ) : (
              <Alert variant="warning">
                <AlertTitle>Prescriber profile required</AlertTitle>
                <AlertBody>
                  You need to complete your prescriber profile before setting your
                  availability. Add your specialty, prescriber number, and AHPRA number
                  first.
                </AlertBody>
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveTab("prescriber")}
                  >
                    Go to Prescriber Details
                  </Button>
                </div>
              </Alert>
            )}
          </TabsContent>
        )}

        <TabsContent value="security">
          <ProfileSecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
