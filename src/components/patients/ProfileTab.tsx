"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  Hash,
  Pencil,
  X,
  Forward,
} from "lucide-react";
import { useUpdatePatient } from "@/lib/hooks/use-patients";
import type { PatientMapping, UpdatePatientPayload } from "@/types";

// ---- Zod schema for demographics update ----

const updatePatientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dobDay: z.string().min(1, "Day is required"),
  dobMonth: z.string().min(1, "Month is required"),
  dobYear: z.string().min(4, "Year is required"),
  gender: z.string().min(1, "Gender is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  mobile: z.string().min(8, "Mobile number is required"),
  proofOfAgeFileName: z.string().min(1, "Proof of age is required"),
  proofOfAgeFileType: z.string().min(1, "Proof of age is required"),
  state: z.string().optional(),
  country: z.string().optional(),
  medicareNumber: z.string().optional(),
  medicareIRN: z.string().optional(),
  forwardEmail: z.string().optional(),
});

type ProfileFormData = z.infer<typeof updatePatientSchema>;

// ---- Helpers ----

function parseDob(dob: string | null): {
  day: string;
  month: string;
  year: string;
} {
  if (!dob) return { day: "", month: "", year: "" };
  const [year, month, day] = dob.split("-");
  return { day: day ?? "", month: month ?? "", year: year ?? "" };
}

function formatDob(dob: string | null): string {
  if (!dob) return "";
  return new Date(dob).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatAddress(patient: PatientMapping): string {
  const parts = [
    patient.street_address,
    patient.city,
    patient.state,
    patient.postcode,
    patient.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
}

function patientToFormDefaults(patient: PatientMapping): ProfileFormData {
  const { day, month, year } = parseDob(patient.date_of_birth);
  return {
    firstName: patient.first_name ?? "",
    lastName: patient.last_name ?? "",
    dobDay: day,
    dobMonth: month,
    dobYear: year,
    gender: patient.gender ?? "",
    streetAddress: patient.street_address ?? "",
    city: patient.city ?? "",
    postcode: patient.postcode ?? "",
    mobile: patient.mobile ?? "",
    proofOfAgeFileName: patient.proof_of_age_file_name ?? "",
    proofOfAgeFileType: patient.proof_of_age_file_type ?? "",
    state: patient.state ?? "",
    country: patient.country ?? "Australia",
    medicareNumber: patient.medicare_number ?? "",
    medicareIRN: patient.medicare_irn ?? "",
    forwardEmail: patient.forward_email ?? "",
  };
}

// ---- View-only field ----

function DetailField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value || "Not available"}</p>
      </div>
    </div>
  );
}

// ---- Component ----

export function ProfileTab({
  patient,
  isLoading,
}: {
  patient: PatientMapping | undefined;
  isLoading: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const updateMutation = useUpdatePatient(patient?.id ?? "");

  const form = useForm<ProfileFormData>({
    defaultValues: patient ? patientToFormDefaults(patient) : {},
  });

  // Reset form when patient data loads/changes
  useEffect(() => {
    if (patient) {
      form.reset(patientToFormDefaults(patient));
    }
  }, [patient, form]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  function handleCancel() {
    if (patient) form.reset(patientToFormDefaults(patient));
    setEditing(false);
  }

  function onSubmit(data: ProfileFormData) {
    const result = updatePatientSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProfileFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    const payload: UpdatePatientPayload = result.data;

    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Patient details updated");
        setEditing(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update patient");
      },
    });
  }

  // ---- Edit mode ----
  if (editing) {
    return (
      <Card>
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Edit Patient Details</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...form.register("firstName")} />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...form.register("lastName")} />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* DOB */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dobDay">Day *</Label>
                <Input id="dobDay" placeholder="DD" {...form.register("dobDay")} />
                {form.formState.errors.dobDay && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.dobDay.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dobMonth">Month *</Label>
                <Input
                  id="dobMonth"
                  placeholder="MM"
                  {...form.register("dobMonth")}
                />
                {form.formState.errors.dobMonth && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.dobMonth.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dobYear">Year *</Label>
                <Input
                  id="dobYear"
                  placeholder="YYYY"
                  {...form.register("dobYear")}
                />
                {form.formState.errors.dobYear && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.dobYear.message}
                  </p>
                )}
              </div>
            </div>

            {/* Gender & Mobile */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Input
                  id="gender"
                  placeholder="e.g. Male, Female, Other"
                  {...form.register("gender")}
                />
                {form.formState.errors.gender && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.gender.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input id="mobile" type="tel" {...form.register("mobile")} />
                {form.formState.errors.mobile && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.mobile.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="streetAddress">Street Address *</Label>
              <Input
                id="streetAddress"
                {...form.register("streetAddress")}
              />
              {form.formState.errors.streetAddress && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.streetAddress.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" {...form.register("city")} />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...form.register("state")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input id="postcode" {...form.register("postcode")} />
                {form.formState.errors.postcode && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.postcode.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register("country")} />
            </div>

            {/* Medicare */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="medicareNumber">Medicare Number</Label>
                <Input
                  id="medicareNumber"
                  {...form.register("medicareNumber")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicareIRN">Medicare IRN</Label>
                <Input id="medicareIRN" {...form.register("medicareIRN")} />
              </div>
            </div>

            {/* Forward email */}
            <div className="space-y-2">
              <Label htmlFor="forwardEmail">Forward Email</Label>
              <Input
                id="forwardEmail"
                type="email"
                {...form.register("forwardEmail")}
              />
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ---- View mode ----
  const displayName = [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Patient Details</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField
            icon={<User className="h-4 w-4" />}
            label="Full Name"
            value={displayName || null}
          />
          <DetailField
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={patient?.original_email}
          />
          <DetailField
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={patient?.mobile}
          />
          <DetailField
            icon={<Calendar className="h-4 w-4" />}
            label="Date of Birth"
            value={formatDob(patient?.date_of_birth ?? null)}
          />
          <DetailField
            icon={<User className="h-4 w-4" />}
            label="Gender"
            value={patient?.gender}
          />
          <DetailField
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={patient ? formatAddress(patient) : null}
          />
          <DetailField
            icon={<CreditCard className="h-4 w-4" />}
            label="Medicare Number"
            value={
              patient?.medicare_number
                ? `${patient.medicare_number}${patient.medicare_irn ? ` / IRN ${patient.medicare_irn}` : ""}`
                : null
            }
          />
          <DetailField
            icon={<Hash className="h-4 w-4" />}
            label="PMS Patient ID"
            value={patient?.halaxy_patient_id}
          />
          <DetailField
            icon={<Forward className="h-4 w-4" />}
            label="Forward Email"
            value={patient?.forward_email}
          />
        </div>
      </CardContent>
    </Card>
  );
}
