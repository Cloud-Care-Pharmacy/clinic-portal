import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listConsultations, createConsultation } from "@/lib/consultations-store";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patientId = req.nextUrl.searchParams.get("patientId") ?? undefined;
  const consultations = listConsultations(patientId);

  return NextResponse.json({ success: true, data: { consultations } });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    patientId,
    patientName,
    doctorId,
    doctorName,
    scheduledAt,
    type,
    duration,
    notes,
  } = body;

  if (!patientId || !patientName || !doctorName || !scheduledAt || !type) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const consultation = createConsultation({
    patientId,
    patientName,
    doctorId: doctorId || "d0",
    doctorName,
    scheduledAt,
    type,
    duration,
    notes,
  });

  return NextResponse.json({ success: true, data: { consultation } }, { status: 201 });
}
