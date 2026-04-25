"use client";

import { useState, useRef } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
import type { PatientDocument, DocumentCategory, DocumentStatus } from "@/types";
import {
  usePatientDocuments,
  useUploadDocument,
  useDeleteDocument,
  useVerifyDocument,
  useSyncEmailAttachments,
} from "@/lib/hooks/use-documents";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  Download,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  FileText,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  proof_of_identity: "Proof of Identity",
  proof_of_age: "Proof of Age",
  prescription: "Prescription",
  lab_result: "Lab Result",
  referral: "Referral",
  consent_form: "Consent Form",
  insurance: "Insurance",
  clinical_report: "Clinical Report",
  imaging: "Imaging",
  correspondence: "Correspondence",
  other: "Other",
};

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsTabProps {
  patientId: string;
}

export function DocumentsTab({ patientId }: DocumentsTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientDocument | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PatientDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const queryOpts: {
    category?: DocumentCategory;
    status?: DocumentStatus;
  } = {};
  if (categoryFilter !== "all") queryOpts.category = categoryFilter;
  if (statusFilter !== "all") queryOpts.status = statusFilter;

  const { data, isLoading, error } = usePatientDocuments(patientId, queryOpts);
  const deleteMutation = useDeleteDocument(patientId);
  const verifyMutation = useVerifyDocument(patientId);
  const syncMutation = useSyncEmailAttachments(patientId);

  const handleVerify = (doc: PatientDocument) => {
    verifyMutation.mutate(
      { documentId: doc.id, data: { action: "verify" } },
      {
        onSuccess: () => toast.success("Document verified"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectionReason.trim()) return;
    verifyMutation.mutate(
      {
        documentId: rejectTarget.id,
        data: { action: "reject", reason: rejectionReason.trim() },
      },
      {
        onSuccess: () => {
          toast.success("Document rejected");
          setRejectTarget(null);
          setRejectionReason("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Document deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDownload = (doc: PatientDocument) => {
    const url = `/api/proxy/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(doc.id)}/download`;
    window.open(url, "_blank");
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(
          `Synced ${res.data.synced} attachment(s), skipped ${res.data.skipped}`
        );
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const columns: GridColDef<PatientDocument>[] = [
    {
      field: "filename",
      headerName: "Filename",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{params.value}</span>
        </div>
      ),
    },
    {
      field: "category",
      headerName: "Category",
      width: 160,
      valueFormatter: (value: DocumentCategory) => CATEGORY_LABELS[value] ?? value,
    },
    {
      field: "file_size",
      headerName: "Size",
      width: 100,
      valueFormatter: (value: number) => formatFileSize(value),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => <StatusBadge status={params.value} />,
    },
    {
      field: "source",
      headerName: "Source",
      width: 120,
      valueFormatter: (value: string) =>
        value === "email_attachment" ? "Email" : "Upload",
    },
    {
      field: "created_at",
      headerName: "Uploaded",
      width: 130,
      valueFormatter: (value: string) =>
        new Date(value).toLocaleDateString("en-AU", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownload(params.row)}>
              <Download className="mr-2 size-4" />
              Download
            </DropdownMenuItem>
            {params.row.status === "uploaded" && (
              <>
                <DropdownMenuItem onClick={() => handleVerify(params.row)}>
                  <CheckCircle className="mr-2 size-4" />
                  Verify
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRejectTarget(params.row)}>
                  <XCircle className="mr-2 size-4" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteTarget(params.row)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="No documents"
        description="Unable to load documents for this patient."
      />
    );
  }

  const documents = data?.data?.documents ?? [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            if (v) setCategoryFilter(v as DocumentCategory | "all");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v) setStatusFilter(v as DocumentStatus | "all");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="uploaded">Uploaded</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 size-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            Sync Emails
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 size-4" />
            Upload
          </Button>
        </div>
      </div>

      {/* Table */}
      {documents.length === 0 ? (
        <EmptyState
          title="No documents"
          description="No documents found. Upload a document or sync email attachments."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <DataGrid
            rows={documents}
            columns={columns}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            rowHeight={56}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            sx={dataGridSx}
          />
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        patientId={patientId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &ldquo;{deleteTarget?.filename}&rdquo;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting &ldquo;{rejectTarget?.filename}
              &rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || verifyMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Upload Dialog ----

function UploadDialog({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadDocument(patientId);

  const reset = () => {
    setFile(null);
    setCategory("other");
    setDescription("");
    setExpiryDate("");
    setFileError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFileError("Unsupported file type. Allowed: PDF, JPEG, PNG, HEIC, HEIF, WebP");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 10 MB.");
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(
      {
        file,
        category,
        description: description.trim() || undefined,
        expiry_date: expiryDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Document uploaded");
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this patient. Max 10 MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"
              onChange={handleFileChange}
            />
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({formatFileSize(file.size)})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                if (v) setCategory(v as DocumentCategory);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-description">Description (optional)</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description…"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Expiry Date (optional)</Label>
            <Popover>
              <PopoverTrigger
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  !expiryDate && "text-muted-foreground"
                )}
              >
                <span>
                  {expiryDate
                    ? new Date(expiryDate + "T00:00:00").toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "Pick a date"}
                </span>
                <CalendarIcon className="h-4 w-4 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarWidget
                  mode="single"
                  captionLayout="dropdown"
                  selected={expiryDate ? new Date(expiryDate + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      setExpiryDate(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setExpiryDate("");
                    }
                  }}
                  defaultMonth={
                    expiryDate ? new Date(expiryDate + "T00:00:00") : new Date()
                  }
                  startMonth={new Date()}
                  endMonth={new Date(2040, 11)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
