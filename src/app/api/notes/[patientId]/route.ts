import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { PatientNote, NoteCategory } from "@/types";
import { notesStore } from "@/lib/notes-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await params;
  const notes = notesStore.getByPatient(patientId);

  return NextResponse.json({
    success: true,
    data: { patientId, notes },
  });
}

const VALID_CATEGORIES: NoteCategory[] = [
  "clinical",
  "pharmacy",
  "follow-up",
  "general",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { title, content, category, authorName, authorRole, isPinned } = body as Record<
    string,
    unknown
  >;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "title is required" },
      { status: 400 }
    );
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "content is required" },
      { status: 400 }
    );
  }

  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.includes(category as NoteCategory)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "category must be one of: clinical, pharmacy, follow-up, general",
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const note: PatientNote = {
    id: crypto.randomUUID(),
    patientId,
    title: (title as string).trim(),
    content: content.trim(),
    category: category as NoteCategory,
    isPinned: typeof isPinned === "boolean" ? isPinned : false,
    authorName: typeof authorName === "string" ? authorName : "Staff Member",
    authorRole:
      authorRole === "admin" || authorRole === "doctor" || authorRole === "staff"
        ? authorRole
        : "staff",
    createdAt: now,
    updatedAt: now,
  };

  notesStore.add(note);

  return NextResponse.json({ success: true, data: note }, { status: 201 });
}
