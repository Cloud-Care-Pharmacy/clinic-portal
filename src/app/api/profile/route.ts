import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import type { UserProfile, UserProfileResponse } from "@/types";

/**
 * Mock API route simulating the future backend endpoints:
 *   GET  /api/users/me
 *   PUT  /api/users/me
 *
 * When prescription-gateway adds these endpoints, replace this file
 * by changing the hook fetch URLs from `/api/profile` to `/api/proxy/users/me`.
 *
 * In-memory store — data resets on server restart. Good enough for UI development.
 */

const store = new Map<string, UserProfile>();

function getOrCreateProfile(userId: string): UserProfile {
  const existing = store.get(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: userId,
    hpii: null,
    prescriber_number: null,
    qualifications: null,
    phone: null,
    role: "staff",
    availability_days: null,
    title: null,
    specialty: null,
    ahpra_number: null,
    hospital_provider_number: null,
    business_phone: null,
    business_email: null,
    provider_number: null,
    date_of_birth: null,
    gender: null,
    business_street_number: null,
    business_street_name: null,
    business_suburb: null,
    business_state: null,
    business_postcode: null,
    created_at: now,
    updated_at: now,
  };
  store.set(userId, profile);
  return profile;
}

const updateSchema = z.object({
  phone: z.string().max(20).optional(),
  hpii: z
    .string()
    .refine((v) => /^\d{16}$/.test(v), "HPII must be exactly 16 digits")
    .optional(),
  prescriberNumber: z.string().max(10).optional(),
  qualifications: z.string().max(500).optional(),
  availabilityDays: z.array(z.string()).optional(),
  // Prescriber details
  title: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  ahpraNumber: z.string().max(20).optional(),
  hospitalProviderNumber: z.string().max(20).optional(),
  businessPhone: z.string().max(20).optional(),
  businessEmail: z.string().email().or(z.literal("")).optional(),
  providerNumber: z.string().max(20).optional(),
  dateOfBirth: z.string().max(10).optional(),
  gender: z.string().max(20).optional(),
  // Business address
  businessStreetNumber: z.string().max(20).optional(),
  businessStreetName: z.string().max(100).optional(),
  businessSuburb: z.string().max(100).optional(),
  businessState: z.string().max(3).optional(),
  businessPostcode: z.string().max(10).optional(),
});

export async function GET() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const profile = getOrCreateProfile(userId);
  // Sync role from Clerk session
  const role = sessionClaims?.metadata?.role;
  if (role === "admin" || role === "doctor" || role === "staff") {
    profile.role = role;
  }

  const body: UserProfileResponse = { success: true, data: { profile } };
  return NextResponse.json(body);
}

export async function PUT(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const json = await req.json();
  const result = updateSchema.safeParse(json);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return NextResponse.json(
      { success: false, error: "Validation failed", details: firstIssue?.message },
      { status: 400 }
    );
  }

  const profile = getOrCreateProfile(userId);
  const role = sessionClaims?.metadata?.role;
  if (role === "admin" || role === "doctor" || role === "staff") {
    profile.role = role;
  }

  const {
    phone,
    hpii,
    prescriberNumber,
    qualifications,
    availabilityDays,
    title,
    specialty,
    ahpraNumber,
    hospitalProviderNumber,
    businessPhone,
    businessEmail,
    providerNumber,
    dateOfBirth,
    gender,
    businessStreetNumber,
    businessStreetName,
    businessSuburb,
    businessState,
    businessPostcode,
  } = result.data;

  // Doctor-specific fields: only doctors can write these
  const hasDoctorFields =
    hpii !== undefined ||
    prescriberNumber !== undefined ||
    qualifications !== undefined ||
    title !== undefined ||
    specialty !== undefined ||
    ahpraNumber !== undefined ||
    hospitalProviderNumber !== undefined ||
    businessPhone !== undefined ||
    businessEmail !== undefined ||
    providerNumber !== undefined ||
    dateOfBirth !== undefined ||
    gender !== undefined ||
    businessStreetNumber !== undefined ||
    businessStreetName !== undefined ||
    businessSuburb !== undefined ||
    businessState !== undefined ||
    businessPostcode !== undefined;
  if (hasDoctorFields && profile.role !== "doctor") {
    return NextResponse.json(
      { success: false, error: "Only doctors can update professional fields" },
      { status: 403 }
    );
  }

  if (phone !== undefined) profile.phone = phone || null;
  if (hpii !== undefined) profile.hpii = hpii || null;
  if (prescriberNumber !== undefined)
    profile.prescriber_number = prescriberNumber || null;
  if (qualifications !== undefined) profile.qualifications = qualifications || null;
  if (availabilityDays !== undefined)
    profile.availability_days = availabilityDays.length ? availabilityDays : null;
  if (title !== undefined) profile.title = title || null;
  if (specialty !== undefined) profile.specialty = specialty || null;
  if (ahpraNumber !== undefined) profile.ahpra_number = ahpraNumber || null;
  if (hospitalProviderNumber !== undefined)
    profile.hospital_provider_number = hospitalProviderNumber || null;
  if (businessPhone !== undefined) profile.business_phone = businessPhone || null;
  if (businessEmail !== undefined) profile.business_email = businessEmail || null;
  if (providerNumber !== undefined) profile.provider_number = providerNumber || null;
  if (dateOfBirth !== undefined) profile.date_of_birth = dateOfBirth || null;
  if (gender !== undefined) profile.gender = gender || null;
  if (businessStreetNumber !== undefined)
    profile.business_street_number = businessStreetNumber || null;
  if (businessStreetName !== undefined)
    profile.business_street_name = businessStreetName || null;
  if (businessSuburb !== undefined) profile.business_suburb = businessSuburb || null;
  if (businessState !== undefined) profile.business_state = businessState || null;
  if (businessPostcode !== undefined)
    profile.business_postcode = businessPostcode || null;
  profile.updated_at = new Date().toISOString();

  store.set(userId, profile);

  const body: UserProfileResponse = { success: true, data: { profile } };
  return NextResponse.json(body);
}
