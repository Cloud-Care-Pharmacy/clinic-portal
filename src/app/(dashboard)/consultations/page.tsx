"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Consultation } from "@/types";

// Mock data — replace with real API calls when backend is ready
const mockConsultations: Consultation[] = [
  {
    id: "1",
    patientId: "p1",
    patientName: "John Smith",
    doctorId: "d1",
    doctorName: "Dr. Sarah Chen",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    type: "initial",
    notes: "First consultation for smoking cessation program.",
  },
  {
    id: "2",
    patientId: "p2",
    patientName: "Maria Garcia",
    doctorId: "d2",
    doctorName: "Dr. James Wilson",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    type: "follow-up",
    notes: "2-week follow-up — assess NRT compliance.",
  },
  {
    id: "3",
    patientId: "p3",
    patientName: "David Lee",
    doctorId: "d1",
    doctorName: "Dr. Sarah Chen",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    completedAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 30
    ).toISOString(),
    type: "renewal",
    notes: "Prescription renewal — stable patient, continuing therapy.",
    outcome: "Prescription renewed for 3 months.",
  },
  {
    id: "4",
    patientId: "p4",
    patientName: "Anna Brown",
    doctorId: "d2",
    doctorName: "Dr. James Wilson",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    completedAt: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 20
    ).toISOString(),
    type: "initial",
    notes: "Initial intake assessment completed.",
    outcome: "Referred for NRT protocol.",
  },
];

const typeColors: Record<string, string> = {
  initial: "bg-blue-100 text-blue-800 border-blue-200",
  "follow-up": "bg-purple-100 text-purple-800 border-purple-200",
  renewal: "bg-green-100 text-green-800 border-green-200",
};

function groupByDate(consultations: Consultation[]) {
  const groups: Record<string, Consultation[]> = {};
  for (const c of consultations) {
    const dateKey = new Date(c.scheduledAt).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(c);
  }
  return Object.entries(groups).sort(
    ([, a], [, b]) =>
      new Date(b[0].scheduledAt).getTime() -
      new Date(a[0].scheduledAt).getTime()
  );
}

export default function ConsultationsPage() {
  const grouped = groupByDate(mockConsultations);
  const upcoming = mockConsultations.filter((c) => !c.completedAt);
  const past = mockConsultations.filter((c) => !!c.completedAt);

  return (
    <div className="space-y-6">
      <PageHeader title="Consultations" />

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        This page shows placeholder data. Connect the consultation backend to
        see real data.
      </div>

      {/* Upcoming */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.patientName}</span>
                    <Badge
                      variant="outline"
                      className={typeColors[c.type] ?? ""}
                    >
                      {c.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.doctorName} ·{" "}
                    {new Date(c.scheduledAt).toLocaleString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {c.notes && (
                    <p className="text-sm text-muted-foreground">{c.notes}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Past */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Past ({past.length})</h2>
        {past.map((c) => (
          <Card key={c.id} className="opacity-75">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.patientName}</span>
                    <Badge
                      variant="outline"
                      className={typeColors[c.type] ?? ""}
                    >
                      {c.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.doctorName} ·{" "}
                    {new Date(c.scheduledAt).toLocaleString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {c.outcome && (
                    <p className="text-sm">Outcome: {c.outcome}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
