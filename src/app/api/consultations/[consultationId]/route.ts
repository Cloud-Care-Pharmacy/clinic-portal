import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getConsultation,
  updateConsultation,
  deleteConsultation,
} from "@/lib/consultations-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { consultationId } = await params;
  const consultation = getConsultation(consultationId);
  if (!consultation) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { consultation } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { consultationId } = await params;
  const body = await req.json();
  const { status, outcome, notes, completedAt } = body;

  const updated = updateConsultation(consultationId, {
    status,
    outcome,
    notes,
    completedAt,
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { consultation: updated } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { consultationId } = await params;
  const deleted = deleteConsultation(consultationId);

  if (!deleted) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
