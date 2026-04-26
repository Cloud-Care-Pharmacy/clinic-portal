"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  HardDrive,
  Mail,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useDeleteDocument,
  useUpdateDocument,
  useVerifyDocument,
} from "@/lib/hooks/use-documents";
import type { DocumentCategory, PatientDocument } from "@/types";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_CATEGORY_VALUES,
  formatDocumentDate,
  formatDocumentTimestamp,
  formatFileSize,
  getDocumentCategoryLabel,
  getDocumentDownloadHref,
} from "./document-utils";

const documentMetadataSchema = z.object({
  category: z
    .string()
    .refine(
      (value) => DOCUMENT_CATEGORY_VALUES.includes(value as DocumentCategory),
      "Category is required"
    ),
  description: z.string().max(500, "Description must be 500 characters or fewer"),
  expiry_date: z
    .string()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Use YYYY-MM-DD format"
    ),
});

type DocumentMetadataFormData = {
  category: DocumentCategory;
  description: string;
  expiry_date: string;
};

interface DocumentDetailSheetProps {
  patientId: string;
  document: PatientDocument | null;
  onClose: () => void;
}

function documentToFormDefaults(document: PatientDocument): DocumentMetadataFormData {
  return {
    category: document.category,
    description: document.description ?? "",
    expiry_date: document.expiry_date?.slice(0, 10) ?? "",
  };
}

function MetadataItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-foreground wrap-break-word">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DocumentDetailSheet({
  patientId,
  document,
  onClose,
}: DocumentDetailSheetProps) {
  const formId = useId();
  const updateDocument = useUpdateDocument(patientId);
  const verifyDocument = useVerifyDocument(patientId);
  const deleteDocument = useDeleteDocument(patientId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const form = useForm<DocumentMetadataFormData>({
    defaultValues: document
      ? documentToFormDefaults(document)
      : { category: "other", description: "", expiry_date: "" },
  });
  const categoryValue = useWatch({ control: form.control, name: "category" });

  useEffect(() => {
    if (!document) return;
    form.reset(documentToFormDefaults(document));
  }, [document, form]);

  if (!document) return null;

  const isBusy =
    updateDocument.isPending || verifyDocument.isPending || deleteDocument.isPending;
  const canReview = document.status === "uploaded";

  function closeSheet() {
    setDeleteOpen(false);
    setRejectOpen(false);
    setRejectionReason("");
    onClose();
  }

  function handleDownload() {
    window.open(getDocumentDownloadHref(patientId, document!.id), "_blank", "noopener");
  }

  function onSubmit(data: DocumentMetadataFormData) {
    const result = documentMetadataSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof DocumentMetadataFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    updateDocument.mutate(
      {
        documentId: document!.id,
        data: {
          category: result.data.category as DocumentCategory,
          description: result.data.description.trim(),
          expiry_date: result.data.expiry_date || null,
        },
      },
      {
        onSuccess: (response) => {
          toast.success("Document updated");
          form.reset(documentToFormDefaults(response.data.document));
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleVerify() {
    verifyDocument.mutate(
      { documentId: document!.id, data: { action: "verify" } },
      {
        onSuccess: () => {
          toast.success("Document verified");
          setRejectOpen(false);
          setRejectionReason("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleReject() {
    const reason = rejectionReason.trim();
    if (!reason) return;
    verifyDocument.mutate(
      { documentId: document!.id, data: { action: "reject", reason } },
      {
        onSuccess: () => {
          toast.success("Document rejected");
          setRejectOpen(false);
          setRejectionReason("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleDelete() {
    deleteDocument.mutate(document!.id, {
      onSuccess: () => {
        toast.success("Document deleted");
        closeSheet();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <>
      <Sheet
        open={!!document}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden sm:max-w-130 sm:min-w-105">
          <SheetHeader>
            <SheetTitle>Document details</SheetTitle>
            <SheetDescription>
              Uploaded {formatDocumentDate(document.created_at)}
            </SheetDescription>
          </SheetHeader>

          <Separator />

          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit)}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="space-y-5 p-4 pb-6">
              <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-status-info-border bg-status-info-bg text-status-info-fg">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold text-foreground"
                      title={document.filename}
                    >
                      {document.filename}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={document.status} />
                      <span className="text-xs text-muted-foreground">
                        {document.content_type}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <MetadataItem icon={<HardDrive className="size-4" />} label="Size">
                  {formatFileSize(document.file_size)}
                </MetadataItem>
                <MetadataItem
                  icon={
                    document.source === "email_attachment" ? (
                      <Mail className="size-4" />
                    ) : (
                      <UploadCloud className="size-4" />
                    )
                  }
                  label="Source"
                >
                  {document.source === "email_attachment" ? "Email" : "Upload"}
                </MetadataItem>
                <MetadataItem icon={<CalendarDays className="size-4" />} label="Expiry">
                  {formatDocumentDate(document.expiry_date)}
                </MetadataItem>
                <MetadataItem
                  icon={<CheckCircle2 className="size-4" />}
                  label="Verified"
                >
                  {formatDocumentTimestamp(document.verified_at)}
                </MetadataItem>
              </section>

              {document.rejection_reason && (
                <section className="rounded-xl border border-status-danger-border bg-status-danger-bg p-3">
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-status-danger-fg" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-status-danger-fg">
                        Rejection reason
                      </h3>
                      <p className="mt-1 text-sm text-status-danger-fg wrap-break-word">
                        {document.rejection_reason}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Editable metadata
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Update the category, description, or expiry date for this file.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document-category">Category</Label>
                  <Select
                    value={categoryValue}
                    onValueChange={(value) => {
                      if (value) {
                        form.setValue("category", value as DocumentCategory, {
                          shouldDirty: true,
                        });
                        form.clearErrors("category");
                      }
                    }}
                  >
                    <SelectTrigger
                      id="document-category"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.category}
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.category.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document-description">Description</Label>
                  <Textarea
                    id="document-description"
                    placeholder="Brief description…"
                    rows={3}
                    aria-invalid={!!form.formState.errors.description}
                    {...form.register("description")}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document-expiry-date">Expiry date</Label>
                  <Input
                    id="document-expiry-date"
                    type="date"
                    aria-invalid={!!form.formState.errors.expiry_date}
                    {...form.register("expiry_date")}
                  />
                  {form.formState.errors.expiry_date && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.expiry_date.message}
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Verification actions
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {canReview
                      ? "Verify the uploaded document or reject it with a reason."
                      : `Current status: ${document.status}.`}
                  </p>
                </div>

                {canReview ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleVerify}
                        disabled={isBusy}
                      >
                        <CheckCircle2 className="size-4" />
                        Verify document
                      </Button>
                      <Button
                        type="button"
                        variant="outline-destructive"
                        onClick={() => setRejectOpen((open) => !open)}
                        disabled={isBusy}
                      >
                        <XCircle className="size-4" />
                        Reject document
                      </Button>
                    </div>

                    {rejectOpen && (
                      <div className="space-y-2 rounded-lg border border-status-danger-border bg-status-danger-bg p-3">
                        <Label
                          htmlFor="document-rejection-reason"
                          className="text-status-danger-fg"
                        >
                          Rejection reason
                        </Label>
                        <Textarea
                          id="document-rejection-reason"
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          placeholder="Explain why this document cannot be accepted…"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setRejectOpen(false);
                              setRejectionReason("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectionReason.trim() || isBusy}
                          >
                            Reject document
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <StatusBadge status={document.status}>
                    {document.status === "verified" ? "Verified" : "Rejected"}
                  </StatusBadge>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                <dl className="grid gap-2">
                  <div className="flex justify-between gap-3">
                    <dt>Category</dt>
                    <dd className="text-right text-foreground">
                      {getDocumentCategoryLabel(document.category)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Uploaded</dt>
                    <dd className="text-right text-foreground">
                      {formatDocumentTimestamp(document.created_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Last updated</dt>
                    <dd className="text-right text-foreground">
                      {formatDocumentTimestamp(document.updated_at)}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </form>

          <SheetFooter className="border-t bg-popover sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={handleDownload}>
              <Download className="size-4" />
              Download
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isBusy}
              >
                <Trash2 className="size-4" />
                Delete document
              </Button>
              <Button
                type="submit"
                form={formId}
                disabled={isBusy || !form.formState.isDirty}
              >
                {updateDocument.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &ldquo;{document.filename}&rdquo;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
            >
              Delete document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
