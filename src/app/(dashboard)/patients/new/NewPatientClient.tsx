"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/PageHeader";

// ---- Zod Schemas per step ----

const step1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(8, "Phone number is required"),
  dobDay: z.string().min(1, "Day is required"),
  dobMonth: z.string().min(1, "Month is required"),
  dobYear: z.string().min(4, "Year is required"),
  gender: z.string().min(1, "Gender is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().min(1, "Country is required"),
  medicareNumber: z.string().optional(),
  medicareIRN: z.string().optional(),
});

const step2Schema = z.object({
  smokingStatus: z.string().min(1, "Smoking status is required"),
});

const step3Schema = z.object({
  cigarettesPerDay: z.string().optional(),
  yearsSmoked: z.string().optional(),
  timesTriedQuitting: z.string().optional(),
  quitMotivation: z.array(z.string()).optional(),
  quitMethods: z.array(z.string()).optional(),
  quitMethodExplanation: z.string().optional(),
  lastCigarette: z.string().optional(),
});

const step4Schema = z.object({
  vapingStatus: z.string().min(1, "Vaping status is required"),
});

const step5Schema = z.object({
  vapingMethod: z.string().optional(),
  vapingStrength: z.string().optional(),
  vapingVolume: z.string().optional(),
  vapingNotes: z.string().optional(),
});

const step6Schema = z.object({
  hasMedicalConditions: z.string().min(1, "Required"),
  medicalConditions: z.array(z.string()).optional(),
  medicalConditionsOther: z.string().optional(),
  takesMedication: z.string().min(1, "Required"),
  highRiskMedications: z.array(z.string()).optional(),
  medicationsList: z.string().optional(),
  cardiovascular: z.string().min(1, "Required"),
  pregnancy: z.string().min(1, "Required"),
  forwardEmail: z.string().optional(),
  additionalNotes: z.string().optional(),
});

const step7Schema = z.object({
  proofOfAge: z.string().min(1, "Proof of age document is required"),
  proofOfAgeFileName: z.string().min(1),
  proofOfAgeFileType: z.string().min(1),
});

const step8Schema = z.object({
  safetyAcknowledgment: z
    .string()
    .min(1, "You must acknowledge the safety information"),
});

const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step6Schema)
  .merge(step7Schema)
  .merge(step8Schema);

type FormData = z.infer<typeof fullSchema>;

const stepSchemas = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  step8Schema,
];

const stepLabels = [
  "Personal Info",
  "Smoking Status",
  "Smoking History",
  "Vaping Status",
  "Vaping History",
  "Medical History",
  "ID Verification",
  "Consent",
];

const DRAFT_KEY = "intake-draft";

// ---- Individual Step Components ----

function Step1PersonalInfo() {
  const {
    register,
    formState: { errors },
  } = useFormContext<FormData>();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" {...register("firstName")} />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...register("lastName")} />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile *</Label>
          <Input id="mobile" type="tel" {...register("mobile")} />
          {errors.mobile && (
            <p className="text-sm text-destructive">{errors.mobile.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dobDay">Day *</Label>
          <Input id="dobDay" placeholder="DD" {...register("dobDay")} />
          {errors.dobDay && (
            <p className="text-sm text-destructive">{errors.dobDay.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dobMonth">Month *</Label>
          <Input id="dobMonth" placeholder="MM" {...register("dobMonth")} />
          {errors.dobMonth && (
            <p className="text-sm text-destructive">{errors.dobMonth.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dobYear">Year *</Label>
          <Input id="dobYear" placeholder="YYYY" {...register("dobYear")} />
          {errors.dobYear && (
            <p className="text-sm text-destructive">{errors.dobYear.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender">Gender *</Label>
        <Input
          id="gender"
          {...register("gender")}
          placeholder="e.g. Male, Female, Other"
        />
        {errors.gender && (
          <p className="text-sm text-destructive">{errors.gender.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="streetAddress">Street Address *</Label>
        <Input id="streetAddress" {...register("streetAddress")} />
        {errors.streetAddress && (
          <p className="text-sm text-destructive">{errors.streetAddress.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input id="city" {...register("city")} />
          {errors.city && (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postcode">Postcode *</Label>
          <Input id="postcode" {...register("postcode")} />
          {errors.postcode && (
            <p className="text-sm text-destructive">{errors.postcode.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country *</Label>
        <Input id="country" {...register("country")} defaultValue="Australia" />
        {errors.country && (
          <p className="text-sm text-destructive">{errors.country.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="medicareNumber">Medicare Number</Label>
          <Input id="medicareNumber" {...register("medicareNumber")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="medicareIRN">Medicare IRN</Label>
          <Input id="medicareIRN" {...register("medicareIRN")} />
        </div>
      </div>
    </div>
  );
}

function Step2SmokingStatus() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormData>();
  const value = watch("smokingStatus");

  return (
    <div className="space-y-4">
      <Label>Have you ever smoked or vaped? *</Label>
      <RadioGroup value={value} onValueChange={(v) => setValue("smokingStatus", v)}>
        {[
          { value: "current-smoker", label: "I currently smoke" },
          { value: "ex-smoker", label: "I used to smoke (ex-smoker)" },
          { value: "vaper", label: "I currently vape" },
          {
            value: "never-smoked-or-vaped",
            label: "I have never smoked or vaped",
          },
        ].map((opt) => (
          <div key={opt.value} className="flex items-center space-x-2">
            <RadioGroupItem value={opt.value} id={opt.value} />
            <Label htmlFor={opt.value}>{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
      {errors.smokingStatus && (
        <p className="text-sm text-destructive">{errors.smokingStatus.message}</p>
      )}
    </div>
  );
}

function Step3SmokingHistory() {
  const { register } = useFormContext<FormData>();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cigarettesPerDay">Cigarettes per day</Label>
        <Input id="cigarettesPerDay" type="number" {...register("cigarettesPerDay")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="yearsSmoked">Years smoked</Label>
        <Input id="yearsSmoked" type="number" {...register("yearsSmoked")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timesTriedQuitting">
          How many times have you tried quitting?
        </Label>
        <Input
          id="timesTriedQuitting"
          type="number"
          {...register("timesTriedQuitting")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastCigarette">When was your last cigarette?</Label>
        <Input id="lastCigarette" {...register("lastCigarette")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quitMethodExplanation">Quit methods tried (explain)</Label>
        <Textarea id="quitMethodExplanation" {...register("quitMethodExplanation")} />
      </div>
    </div>
  );
}

function Step4VapingStatus() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormData>();
  const value = watch("vapingStatus");

  return (
    <div className="space-y-4">
      <Label>Do you currently vape? *</Label>
      <RadioGroup value={value} onValueChange={(v) => setValue("vapingStatus", v)}>
        {[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ].map((opt) => (
          <div key={opt.value} className="flex items-center space-x-2">
            <RadioGroupItem value={opt.value} id={`vaping-${opt.value}`} />
            <Label htmlFor={`vaping-${opt.value}`}>{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
      {errors.vapingStatus && (
        <p className="text-sm text-destructive">{errors.vapingStatus.message}</p>
      )}
    </div>
  );
}

function Step5VapingHistory() {
  const { register } = useFormContext<FormData>();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vapingMethod">Vaping method / device type</Label>
        <Input id="vapingMethod" {...register("vapingMethod")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vapingStrength">Nicotine strength (mg/mL)</Label>
        <Input id="vapingStrength" {...register("vapingStrength")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vapingVolume">Daily usage (mL)</Label>
        <Input id="vapingVolume" {...register("vapingVolume")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vapingNotes">Additional notes</Label>
        <Textarea id="vapingNotes" {...register("vapingNotes")} />
      </div>
    </div>
  );
}

const MEDICAL_CONDITIONS = [
  "Hypertension",
  "Heart attack (MI)",
  "Stroke",
  "Cancer",
  "Diabetes",
  "Asthma / COPD",
  "Epilepsy",
  "Depression / Anxiety",
  "Pregnancy",
];

const HIGH_RISK_MEDS = [
  "Warfarin",
  "Olanzapine",
  "Clozapine",
  "Theophylline",
  "Insulin",
  "Ropinirole",
];

function Step6MedicalHistory() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormData>();

  const conditions = watch("medicalConditions") ?? [];
  const medications = watch("highRiskMedications") ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Do you have any medical conditions? *</Label>
        <RadioGroup
          value={watch("hasMedicalConditions")}
          onValueChange={(v) => setValue("hasMedicalConditions", v)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="conditions-yes" />
            <Label htmlFor="conditions-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="conditions-no" />
            <Label htmlFor="conditions-no">No</Label>
          </div>
        </RadioGroup>
        {errors.hasMedicalConditions && (
          <p className="text-sm text-destructive">
            {errors.hasMedicalConditions.message}
          </p>
        )}
      </div>

      {watch("hasMedicalConditions") === "yes" && (
        <div className="space-y-2">
          <Label>Select conditions:</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MEDICAL_CONDITIONS.map((cond) => (
              <div key={cond} className="flex items-center space-x-2">
                <Checkbox
                  id={cond}
                  checked={conditions.includes(cond)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue("medicalConditions", [...conditions, cond]);
                    } else {
                      setValue(
                        "medicalConditions",
                        conditions.filter((c) => c !== cond)
                      );
                    }
                  }}
                />
                <Label htmlFor={cond}>{cond}</Label>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="medicalConditionsOther">Other conditions</Label>
            <Input
              id="medicalConditionsOther"
              {...register("medicalConditionsOther")}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Label>Do you take any medication? *</Label>
        <RadioGroup
          value={watch("takesMedication")}
          onValueChange={(v) => setValue("takesMedication", v)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="meds-yes" />
            <Label htmlFor="meds-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="meds-no" />
            <Label htmlFor="meds-no">No</Label>
          </div>
        </RadioGroup>
        {errors.takesMedication && (
          <p className="text-sm text-destructive">{errors.takesMedication.message}</p>
        )}
      </div>

      {watch("takesMedication") === "yes" && (
        <div className="space-y-2">
          <Label>High-risk medications:</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {HIGH_RISK_MEDS.map((med) => (
              <div key={med} className="flex items-center space-x-2">
                <Checkbox
                  id={med}
                  checked={medications.includes(med)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue("highRiskMedications", [...medications, med]);
                    } else {
                      setValue(
                        "highRiskMedications",
                        medications.filter((m) => m !== med)
                      );
                    }
                  }}
                />
                <Label htmlFor={med}>{med}</Label>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="medicationsList">List all current medications</Label>
            <Textarea id="medicationsList" {...register("medicationsList")} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Label>
          Do you have any cardiovascular conditions (heart disease, high blood
          pressure)? *
        </Label>
        <RadioGroup
          value={watch("cardiovascular")}
          onValueChange={(v) => setValue("cardiovascular", v)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="cv-yes" />
            <Label htmlFor="cv-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="cv-no" />
            <Label htmlFor="cv-no">No</Label>
          </div>
        </RadioGroup>
        {errors.cardiovascular && (
          <p className="text-sm text-destructive">{errors.cardiovascular.message}</p>
        )}
      </div>

      <div className="space-y-4">
        <Label>Are you pregnant or planning to become pregnant? *</Label>
        <RadioGroup
          value={watch("pregnancy")}
          onValueChange={(v) => setValue("pregnancy", v)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="preg-yes" />
            <Label htmlFor="preg-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="preg-no" />
            <Label htmlFor="preg-no">No</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="na" id="preg-na" />
            <Label htmlFor="preg-na">Not applicable</Label>
          </div>
        </RadioGroup>
        {errors.pregnancy && (
          <p className="text-sm text-destructive">{errors.pregnancy.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalNotes">Additional notes</Label>
        <Textarea id="additionalNotes" {...register("additionalNotes")} />
      </div>
    </div>
  );
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
];

function Step7IDVerification() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormData>();
  const fileName = watch("proofOfAgeFileName");

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 10 MB.");
        return;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(
          "Invalid file type. Please upload JPEG, PNG, HEIC, HEIF, WebP, or PDF."
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setValue("proofOfAge", base64);
        setValue("proofOfAgeFileName", file.name);
        setValue("proofOfAgeFileType", file.type);
      };
      reader.readAsDataURL(file);
    },
    [setValue]
  );

  return (
    <div className="space-y-4">
      <Label>Upload your proof of age document *</Label>
      <p className="text-sm text-muted-foreground">
        Please upload a photo of your driver&apos;s licence or other government-issued
        ID. Accepted formats: JPEG, PNG, HEIC, WebP, PDF. Max 10 MB.
      </p>
      <Input
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.pdf"
        onChange={handleFile}
      />
      {fileName && (
        <p className="text-sm text-status-success-fg">Uploaded: {fileName}</p>
      )}
      {errors.proofOfAge && (
        <p className="text-sm text-destructive">{errors.proofOfAge.message}</p>
      )}
    </div>
  );
}

function Step8Consent() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormData>();
  const ack = watch("safetyAcknowledgment");

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 bg-secondary space-y-3 text-sm">
        <p className="font-semibold">Safety Information</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            Nicotine is a highly addictive substance and should only be used as part of
            a supervised quit-smoking program.
          </li>
          <li>Keep nicotine products out of reach of children and pets.</li>
          <li>
            Do not use nicotine products if you are pregnant or breastfeeding without
            medical advice.
          </li>
          <li>
            If you experience any adverse effects, stop using the product and consult
            your doctor or pharmacist immediately.
          </li>
          <li>
            You understand that providing false medical information may affect your
            treatment and safety.
          </li>
        </ul>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox
          id="safetyAck"
          checked={ack === "yes"}
          onCheckedChange={(checked) =>
            setValue("safetyAcknowledgment", checked ? "yes" : "")
          }
        />
        <Label htmlFor="safetyAck" className="leading-snug">
          I acknowledge the safety information above and confirm that all information
          provided is accurate to the best of my knowledge. *
        </Label>
      </div>
      {errors.safetyAcknowledgment && (
        <p className="text-sm text-destructive">
          {errors.safetyAcknowledgment.message}
        </p>
      )}
    </div>
  );
}

const STEP_COMPONENTS = [
  Step1PersonalInfo,
  Step2SmokingStatus,
  Step3SmokingHistory,
  Step4VapingStatus,
  Step5VapingHistory,
  Step6MedicalHistory,
  Step7IDVerification,
  Step8Consent,
];

// ---- Main Wizard ----

export function NewPatientClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues: Partial<FormData> = (() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  })();

  const methods = useForm<FormData>({
    defaultValues: {
      country: "Australia",
      ...defaultValues,
    } as FormData,
    mode: "onTouched",
  });

  const watchSmokingStatus = methods.watch("smokingStatus");
  const watchVapingStatus = methods.watch("vapingStatus");

  // Save draft on change
  useEffect(() => {
    const subscription = methods.watch((values) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
      } catch {
        // localStorage may be full
      }
    });
    return () => subscription.unsubscribe();
  }, [methods]);

  // Skip smoking history if never smoked
  const shouldSkipSmokingHistory = watchSmokingStatus === "never-smoked-or-vaped";
  // Skip vaping history if not vaping
  const shouldSkipVapingHistory = watchVapingStatus === "no";

  const effectiveStep = step;
  const totalSteps = STEP_COMPONENTS.length;

  const isSkippedStep = (s: number) => {
    if (s === 2 && shouldSkipSmokingHistory) return true;
    if (s === 4 && shouldSkipVapingHistory) return true;
    return false;
  };

  const nextStep = () => {
    let next = step + 1;
    while (next < totalSteps && isSkippedStep(next)) next++;
    setStep(next);
  };

  const prevStep = () => {
    let prev = step - 1;
    while (prev >= 0 && isSkippedStep(prev)) prev--;
    setStep(Math.max(0, prev));
  };

  const validateCurrentStep = async () => {
    const schema = stepSchemas[step];
    const values = methods.getValues();
    const result = schema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof FormData;
        if (fieldName) {
          methods.setError(fieldName, { message: issue.message });
        }
      }
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    const valid = await validateCurrentStep();
    if (valid) nextStep();
  };

  const handleSubmit = async () => {
    const values = methods.getValues();
    const result = fullSchema.safeParse(values);
    if (!result.success) {
      toast.error("Please fix errors before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const values = methods.getValues();
      const res = await fetch("/api/proxy/test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Submission failed");
      }

      const data = await res.json();
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Patient intake submitted successfully!");
      router.push(`/patients/${data.patientId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit intake");
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = STEP_COMPONENTS[effectiveStep];
  const isLastStep = effectiveStep === totalSteps - 1;
  const progressPct = ((effectiveStep + 1) / totalSteps) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="New Patient Intake"
        breadcrumbs={[
          { label: "Patients", href: "/patients" },
          { label: "New Patient" },
        ]}
      />

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {effectiveStep + 1} of {totalSteps}: {stepLabels[effectiveStep]}
          </span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <Progress value={progressPct} />
      </div>

      <FormProvider {...methods}>
        <Card>
          <CardHeader>
            <CardTitle>{stepLabels[effectiveStep]}</CardTitle>
            {effectiveStep === 0 && (
              <CardDescription>Please provide your personal details.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <StepComponent />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={effectiveStep === 0}>
            Previous
          </Button>
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Intake"}
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </FormProvider>
    </div>
  );
}
