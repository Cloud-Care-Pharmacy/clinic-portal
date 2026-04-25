"use client";

import { useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Staff } from "@/types";

// Mock data — replace with real API when backend is ready
const initialStaff: Staff[] = [
  {
    id: "1",
    name: "Dr. Sarah Chen",
    email: "sarah.chen@cloudcare.com.au",
    role: "doctor",
    createdAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "2",
    name: "Dr. James Wilson",
    email: "james.wilson@cloudcare.com.au",
    role: "doctor",
    createdAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily.davis@cloudcare.com.au",
    role: "staff",
    createdAt: "2025-03-10T00:00:00Z",
  },
  {
    id: "4",
    name: "Admin User",
    email: "admin@cloudcare.com.au",
    role: "admin",
    createdAt: "2024-12-01T00:00:00Z",
  },
];

export default function AdminPage() {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "doctor" | "staff">("staff");

  const columns: GridColDef<Staff>[] = [
    { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
    { field: "email", headerName: "Email", flex: 1, minWidth: 220 },
    {
      field: "role",
      headerName: "Role",
      width: 140,
      renderCell: (params) => (
        <Select
          value={params.value}
          onValueChange={(v) => {
            if (!v) return;
            setStaff((prev) =>
              prev.map((s) =>
                s.id === params.row.id ? { ...s, role: v as Staff["role"] } : s
              )
            );
            toast.success(`Role updated to ${v}`);
          }}
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="doctor">Doctor</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      field: "createdAt",
      headerName: "Added",
      width: 120,
      valueFormatter: (value: string) => new Date(value).toLocaleDateString("en-AU"),
    },
    {
      field: "actions",
      headerName: "",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <AlertDialog>
          <AlertDialogTrigger className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-accent">
            <Trash2 className="h-4 w-4 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove {params.row.name} from the system. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setStaff((prev) => prev.filter((s) => s.id !== params.row.id));
                  toast.success("Staff member removed");
                }}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  const handleAdd = () => {
    if (!newName || !newEmail) {
      toast.error("Name and email are required");
      return;
    }
    const newStaff: Staff = {
      id: crypto.randomUUID(),
      name: newName,
      email: newEmail,
      role: newRole,
      createdAt: new Date().toISOString(),
    };
    setStaff((prev) => [...prev, newStaff]);
    setNewName("");
    setNewEmail("");
    setNewRole("staff");
    setAddOpen(false);
    toast.success("Staff member added");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/80">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Add a new staff member to the system. They will be able to log in with
                  their Google account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-name">Name</Label>
                  <Input
                    id="staff-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newRole}
                    onValueChange={(v) => setNewRole(v as "admin" | "doctor" | "staff")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add Staff</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div
        className="rounded-lg border p-4 text-sm"
        style={{
          borderColor: "var(--status-warning-border)",
          backgroundColor: "var(--status-warning-bg)",
          color: "var(--status-warning-fg)",
        }}
      >
        This page shows placeholder data. Connect the staff management backend to
        persist changes.
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={staff}
          columns={columns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          rowHeight={56}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          sx={dataGridSx}
        />
      </div>
    </div>
  );
}
