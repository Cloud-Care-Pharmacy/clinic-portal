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

  const { phone, hpii, prescriberNumber, qualifications } = result.data;

  // Doctor-specific fields: only doctors can write these
  const hasDoctorFields =
    hpii !== undefined ||
    prescriberNumber !== undefined ||
    qualifications !== undefined;
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
  profile.updated_at = new Date().toISOString();

  store.set(userId, profile);

  const body: UserProfileResponse = { success: true, data: { profile } };
  return NextResponse.json(body);
}
