"use client";

import Link from "next/link";
import {
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Plus,
  ClipboardPlus,
} from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RecentActivity, DashboardStats } from "@/types";

const mockStats: DashboardStats = {
  totalPatients: 127,
  pendingConsultations: 8,
  activePrescriptions: 43,
  newThisWeek: 5,
};

const mockActivity: RecentActivity[] = [
  { id: "1", action: "Patient intake completed", patientName: "John Smith", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), user: "Dr. Sarah Chen" },
  { id: "2", action: "Prescription issued", patientName: "Maria Garcia", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), user: "Dr. James Wilson" },
  { id: "3", action: "Consultation scheduled", patientName: "David Lee", timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), user: "Staff – Emily Davis" },
  { id: "4", action: "Patient flagged for review", patientName: "Anna Brown", timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), user: "Dr. Sarah Chen" },
  { id: "5", action: "Document uploaded", patientName: "Tom Wilson", timestamp: new Date(Date.now() - 1000 * 60 * 480).toISOString(), user: "Staff – Mark Johnson" },
];

const activityColumns: GridColDef<RecentActivity>[] = [
  { field: "action", headerName: "Action", flex: 1, minWidth: 180 },
  { field: "patientName", headerName: "Patient", flex: 1, minWidth: 140 },
  { field: "user", headerName: "By", flex: 1, minWidth: 140 },
  {
    field: "timestamp",
    headerName: "Time",
    width: 160,
    valueFormatter: (value: string) =>
      new Date(value).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  },
];

const statCards = [
  { title: "Total Patients", value: mockStats.totalPatients, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { title: "Pending Consultations", value: mockStats.pendingConsultations, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50" },
  { title: "Active Prescriptions", value: mockStats.activePrescriptions, icon: FileText, color: "text-green-600", bg: "bg-green-50" },
  { title: "New This Week", value: mockStats.newThisWeek, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-lg p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/patients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </Link>
        <Link href="/prescriptions">
          <Button variant="outline">
            <ClipboardPlus className="mr-2 h-4 w-4" />
            View Prescriptions
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%" }}>
            <DataGrid
              rows={mockActivity}
              columns={activityColumns}
              autoHeight
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10]}
              initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
              density="compact"
              sx={{
                "& .MuiDataGrid-cell:focus": { outline: "none" },
                "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
