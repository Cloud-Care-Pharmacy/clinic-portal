/* oxlint-disable react-doctor/rendering-hydration-mismatch-time -- Locale-formatted timestamps are rendered with explicit "en-AU" locale; minor server/client timezone offset is acceptable for these display-only values. */
"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSheet } from "@/components/shared/AppSheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  User,
  CreditCard,
  Hash,
  Pencil,
  Forward,
} from "lucide-react";
import { useUpdatePatient } from "@/lib/hooks/use-patients";
import { cn } from "@/lib/utils";
import type { PatientMapping, UpdatePatientPayload } from "@/types";

// ---- Zod schema for demographics update ----

const medicareExpirySchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{4}-\d{2}(-\d{2})?$/.test(value),
    "Use YYYY-MM or YYYY-MM-DD"
  )
  .optional();

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
  state: z.string().optional(),
  country: z.string().optional(),
  medicareNumber: z.string().optional(),
  medicareIrn: z.string().optional(),
  medicareExpiry: medicareExpirySchema,
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

function formatMedicareExpiry(expiry: string | null | undefined): string | null {
  if (!expiry) return null;
  const [year, month, day] = expiry.split("-");
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = day ? Number(day) : 1;

  if (!year || !month || Number.isNaN(yearNumber) || Number.isNaN(monthNumber)) {
    return expiry;
  }

  const date = new Date(yearNumber, monthNumber - 1, dayNumber);
  if (Number.isNaN(date.getTime())) return expiry;

  return date.toLocaleDateString("en-AU", {
    ...(day ? { day: "numeric" as const } : {}),
    month: "short",
    year: "numeric",
  });
}

function formMedicareExpiry(expiry: string | null): string {
  if (!expiry) return "";
  return /^\d{4}-\d{2}/.test(expiry) ? expiry.slice(0, 7) : expiry;
}

function nullableOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatAddress(patient: PatientMapping): string {
  const parts = [
    patient.streetAddress,
    patient.city,
    patient.state,
    patient.postcode,
    patient.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
}

function patientToFormDefaults(patient: PatientMapping): ProfileFormData {
  const { day, month, year } = parseDob(patient.dateOfBirth);
  return {
    firstName: patient.firstName ?? "",
    lastName: patient.lastName ?? "",
    dobDay: day,
    dobMonth: month,
    dobYear: year,
    gender: patient.gender ?? "",
    streetAddress: patient.streetAddress ?? "",
    city: patient.city ?? "",
    postcode: patient.postcode ?? "",
    mobile: patient.mobile ?? "",
    state: patient.state ?? "",
    country: patient.country ?? "Australia",
    medicareNumber: patient.medicareNumber ?? "",
    medicareIrn: patient.medicareIrn ?? "",
    medicareExpiry: formMedicareExpiry(patient.medicareExpiry),
    forwardEmail: patient.forwardEmail ?? "",
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

// ---- Date of Birth Picker ----

function DateOfBirthPicker({
  form,
}: {
  form: ReturnType<typeof useForm<ProfileFormData>>;
}) {
  const [open, setOpen] = useState(false);
  const dobDay = form.watch("dobDay");
  const dobMonth = form.watch("dobMonth");
  const dobYear = form.watch("dobYear");

  const selectedDate =
    dobDay && dobMonth && dobYear
      ? new Date(Number(dobYear), Number(dobMonth) - 1, Number(dobDay))
      : undefined;

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      form.setValue("dobDay", String(date.getDate()).padStart(2, "0"), {
        shouldDirty: true,
      });
      form.setValue("dobMonth", String(date.getMonth() + 1).padStart(2, "0"), {
        shouldDirty: true,
      });
      form.setValue("dobYear", String(date.getFullYear()), { shouldDirty: true });
      form.clearErrors(["dobDay", "dobMonth", "dobYear"]);
      setOpen(false);
    },
    [form]
  );

  const displayValue =
    selectedDate && !isNaN(selectedDate.getTime())
      ? selectedDate.toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

  const hasError =
    form.formState.errors.dobDay ||
    form.formState.errors.dobMonth ||
    form.formState.errors.dobYear;

  return (
    <div className="space-y-2">
      <Label>Date of Birth *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            !displayValue && "text-muted-foreground",
            hasError && "border-destructive ring-3 ring-destructive/20"
          )}
        >
          <span>{displayValue ?? "Pick a date"}</span>
          <CalendarIcon className="size-4  opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarWidget
            mode="single"
            captionLayout="dropdown"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate ?? new Date(1990, 0)}
            startMonth={new Date(1900, 0)}
            endMonth={new Date()}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
      {hasError && (
        <p className="text-sm text-destructive">Date of birth is required</p>
      )}
    </div>
  );
}

// ---- Edit Sheet ----

export function PatientEditSheet({
  patient,
  open,
  onOpenChange,
}: {
  patient: PatientMapping | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formId = useId();
  const updateMutation = useUpdatePatient(patient?.id ?? "");

  const form = useForm<ProfileFormData>({
    defaultValues: patient ? patientToFormDefaults(patient) : {},
  });

  // Sync RHF form values when the patient prop changes (e.g. profile sheet
  // reopens for a different patient). Not an event handler — it's external
  // state synchronisation.
  useEffect(() => {
    if (patient) {
      form.reset(patientToFormDefaults(patient));
    }
  }, [patient, form]);

  function handleCancel() {
    if (patient) form.reset(patientToFormDefaults(patient));
    onOpenChange(false);
  }

  function onSubmit(data: ProfileFormData) {
    if (!patient?.id) {
      toast.error("Patient details are not ready yet");
      return;
    }

    const result = updatePatientSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProfileFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    // Build a partial payload from only the fields the user actually changed.
    // The PATCH endpoint accepts any subset of allowed fields and rejects unknown
    // ones, so we explicitly map dirty form fields → API field names here.
    const dirty = form.formState.dirtyFields;
    const payload: UpdatePatientPayload = {};
    const validated = result.data;

    if (dirty.firstName) payload.firstName = validated.firstName;
    if (dirty.lastName) payload.lastName = validated.lastName;
    if (dirty.gender) payload.gender = validated.gender;
    if (dirty.mobile) payload.mobile = validated.mobile;
    if (dirty.streetAddress) payload.streetAddress = validated.streetAddress;
    if (dirty.city) payload.city = validated.city;
    if (dirty.state) payload.state = validated.state ?? "";
    if (dirty.postcode) payload.postcode = validated.postcode;
    if (dirty.country) payload.country = validated.country ?? "";
    if (dirty.medicareNumber) payload.medicareNumber = validated.medicareNumber ?? "";
    if (dirty.medicareIrn) payload.medicareIrn = validated.medicareIrn ?? "";
    if (dirty.medicareExpiry)
      payload.medicareExpiry = nullableOptional(validated.medicareExpiry);
    if (dirty.forwardEmail) payload.forwardEmail = validated.forwardEmail ?? "";

    // DOB is split into three inputs in the form but sent as a single
    // `dateOfBirth: 'YYYY-MM-DD'` string to the PATCH endpoint.
    if (dirty.dobDay || dirty.dobMonth || dirty.dobYear) {
      payload.dateOfBirth = `${validated.dobYear}-${validated.dobMonth.padStart(2, "0")}-${validated.dobDay.padStart(2, "0")}`;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save");
      onOpenChange(false);
      return;
    }

    updateMutation.mutate(payload, {
      onSuccess: ({ data: { patient: updated } }) => {
        toast.success("Patient details updated");
        // Reset form with the saved data so dirty state clears and a subsequent
        // edit only sends the next set of changes.
        form.reset(patientToFormDefaults(updated));
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update patient");
      },
    });
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleCancel();
        else onOpenChange(nextOpen);
      }}
      title="Edit Patient Details"
      description="Update patient demographics and contact information."
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" {...form.register("lastName")} />
            {form.formState.errors.lastName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        {/* DOB */}
        <DateOfBirthPicker form={form} />

        {/* Gender & Mobile */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender *</Label>
            <Input
              id="gender"
              placeholder="e.g. Male, Female, Other"
              {...form.register("gender")}
            />
            {form.formState.errors.gender && (
              <p className="text-sm text-destructive">
                {form.formState.errors.gender.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile *</Label>
            <Input id="mobile" type="tel" {...form.register("mobile")} />
            {form.formState.errors.mobile && (
              <p className="text-sm text-destructive">
                {form.formState.errors.mobile.message}
              </p>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="streetAddress">Street Address *</Label>
          <Input id="streetAddress" {...form.register("streetAddress")} />
          {form.formState.errors.streetAddress && (
            <p className="text-sm text-destructive">
              {form.formState.errors.streetAddress.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input id="city" {...form.register("city")} />
            {form.formState.errors.city && (
              <p className="text-sm text-destructive">
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
              <p className="text-sm text-destructive">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="medicareNumber">Medicare Number</Label>
            <Input id="medicareNumber" {...form.register("medicareNumber")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medicareIrn">Medicare IRN</Label>
            <Input id="medicareIrn" {...form.register("medicareIrn")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medicareExpiry">Medicare Expiry</Label>
            <Input
              id="medicareExpiry"
              type="month"
              {...form.register("medicareExpiry")}
            />
            {form.formState.errors.medicareExpiry && (
              <p className="text-sm text-destructive">
                {form.formState.errors.medicareExpiry.message}
              </p>
            )}
          </div>
        </div>

        {/* Forward email */}
        <div className="space-y-2">
          <Label htmlFor="forwardEmail">Forward Email</Label>
          <Input id="forwardEmail" type="email" {...form.register("forwardEmail")} />
        </div>
      </form>
    </AppSheet>
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Patient Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Patient Details</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4  mr-1" />
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField
              icon={<User className="size-4 " />}
              label="Full Name"
              value={displayName || null}
            />
            <DetailField
              icon={<Mail className="size-4 " />}
              label="Email"
              value={patient?.originalEmail}
            />
            <DetailField
              icon={<Phone className="size-4 " />}
              label="Phone"
              value={patient?.mobile}
            />
            <DetailField
              icon={<CalendarIcon className="size-4 " />}
              label="Date of Birth"
              value={formatDob(patient?.dateOfBirth ?? null)}
            />
            <DetailField
              icon={<User className="size-4 " />}
              label="Gender"
              value={patient?.gender}
            />
            <DetailField
              icon={<MapPin className="size-4 " />}
              label="Address"
              value={patient ? formatAddress(patient) : null}
            />
            <DetailField
              icon={<CreditCard className="size-4 " />}
              label="Medicare Number"
              value={
                patient?.medicareNumber
                  ? `${patient.medicareNumber}${patient.medicareIrn ? ` / IRN ${patient.medicareIrn}` : ""}`
                  : null
              }
            />
            <DetailField
              icon={<CalendarIcon className="size-4 " />}
              label="Medicare Expiry"
              value={formatMedicareExpiry(patient?.medicareExpiry)}
            />
            <DetailField
              icon={<Hash className="size-4 " />}
              label="PMS Patient ID"
              value={patient?.halaxyPatientId}
            />
            <DetailField
              icon={<Forward className="size-4 " />}
              label="Forward Email"
              value={patient?.forwardEmail}
            />
          </div>
        </CardContent>
      </Card>

      <PatientEditSheet patient={patient} open={editing} onOpenChange={setEditing} />
    </>
  );
}
