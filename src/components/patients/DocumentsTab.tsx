"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { cn } from "@/lib/utils";
import { dataGridSx } from "@/lib/datagrid-theme";
import type { PatientDocument, DocumentCategory } from "@/types";
import {
  usePatientDocuments,
  useUploadDocument,
  useDeleteDocument,
  useVerifyDocument,
} from "@/lib/hooks/use-documents";
import { DocumentDetailSheet } from "@/components/patients/DocumentDetailSheet";
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
  Download,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Trash2,
  FileText,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  DOCUMENT_CATEGORY_LABELS,
  formatFileSize,
  getDocumentDownloadHref,
} from "./document-utils";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentsTabProps {
  patientId: string;
  initialAction?: "upload";
  selectedDocumentId?: string;
}

export function DocumentsTab({
  patientId,
  initialAction,
  selectedDocumentId,
}: DocumentsTabProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<PatientDocument | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PatientDocument | null>(null);
  const [selectedFromRow, setSelectedFromRow] = useState<PatientDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, error } = usePatientDocuments(patientId);
  const deleteMutation = useDeleteDocument(patientId);
  const verifyMutation = useVerifyDocument(patientId);
  const documentUploadOpen = initialAction === "upload";

  const handleUploadOpenChange = (open: boolean) => {
    if (!open && initialAction === "upload") {
      router.replace(`/patients/${encodeURIComponent(patientId)}/documents`, {
        scroll: false,
      });
    }
  };

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
    const url = getDocumentDownloadHref(patientId, doc.id);
    window.open(url, "_blank");
  };

  function selectedDocumentHref(documentId: string) {
    return `/patients/${encodeURIComponent(patientId)}/documents?selected=${encodeURIComponent(documentId)}`;
  }

  function clearSelectedDocument() {
    setSelectedFromRow(null);
    router.replace(`/patients/${encodeURIComponent(patientId)}/documents`, {
      scroll: false,
    });
  }

  function openDocument(doc: PatientDocument) {
    setSelectedFromRow(doc);
    router.push(selectedDocumentHref(doc.id), { scroll: false });
  }

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
      valueFormatter: (value: DocumentCategory) =>
        DOCUMENT_CATEGORY_LABELS[value] ?? value,
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
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(event) => event.stopPropagation()}
                aria-label={`Open actions for ${params.row.filename}`}
              >
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
              variant="destructive"
              onClick={() => setDeleteTarget(params.row)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete document
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
  const selectedDocument = selectedDocumentId
    ? (documents.find((doc) => doc.id === selectedDocumentId) ?? null)
    : selectedFromRow;

  return (
    <div className="space-y-4">
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
            pagination
            disableRowSelectionOnClick
            disableColumnMenu
            columnHeaderHeight={44}
            pageSizeOptions={[10, 25, 50]}
            rowHeight={56}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            onRowClick={(params: GridRowParams<PatientDocument>) =>
              openDocument(params.row)
            }
            getRowClassName={() => "cursor-pointer"}
            sx={dataGridSx}
          />
        </div>
      )}

      <DocumentDetailSheet
        patientId={patientId}
        document={selectedDocument}
        onClose={clearSelectedDocument}
      />

      {/* Upload Dialog */}
      <UploadDialog
        patientId={patientId}
        open={documentUploadOpen}
        onOpenChange={handleUploadOpenChange}
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
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete document
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
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([key, label]) => (
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
