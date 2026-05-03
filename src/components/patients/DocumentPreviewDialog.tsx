"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PatientDocument } from "@/types";
import { formatFileSize, getDocumentDownloadHref } from "./document-utils";

interface DocumentPreviewDialogProps {
  patientId: string;
  document: PatientDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PreviewKind = "pdf" | "image" | "unsupported";

function getPreviewKind(contentType: string): PreviewKind {
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "image";
  return "unsupported";
}

export function DocumentPreviewDialog({
  patientId,
  document,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !document) return;

    const previewKind = getPreviewKind(document.contentType);
    if (previewKind === "unsupported") return;

    const controller = new AbortController();
    let createdUrl: string | null = null;

    fetch(getDocumentDownloadHref(patientId, document.id), {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
        const blob = await res.blob();
        // Use the document's contentType for the blob so the browser renders it inline
        const typedBlob = new Blob([blob], { type: document.contentType });
        createdUrl = URL.createObjectURL(typedBlob);
        setObjectUrl(createdUrl);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Failed to load document";
        setError(message);
      });

    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
      setObjectUrl(null);
      setError(null);
    };
  }, [open, document, patientId]);

  function handleDownload() {
    if (!document) return;
    window.open(getDocumentDownloadHref(patientId, document.id), "_blank", "noopener");
  }

  const previewKind = document ? getPreviewKind(document.contentType) : "unsupported";
  const loading =
    !!open && !!document && previewKind !== "unsupported" && !objectUrl && !error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-5xl flex-col gap-3 p-4 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate" title={document?.filename}>
            {document?.filename ?? "Document preview"}
          </DialogTitle>
          <DialogDescription>
            {document
              ? `${document.contentType} • ${formatFileSize(document.fileSize)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30"
          )}
        >
          {loading && (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading preview…
            </div>
          )}

          {!loading && error && (
            <div className="flex max-w-md flex-col items-center gap-3 p-6 text-center">
              <FileText className="size-8 text-muted-foreground" />
              <p className="text-sm text-foreground">Unable to load preview</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" onClick={handleDownload}>
                <Download className="size-4" />
                Download instead
              </Button>
            </div>
          )}

          {!loading && !error && previewKind === "unsupported" && document && (
            <div className="flex max-w-md flex-col items-center gap-3 p-6 text-center">
              <FileText className="size-8 text-muted-foreground" />
              <p className="text-sm text-foreground">
                Preview is not available for this file type.
              </p>
              <p className="text-xs text-muted-foreground">{document.contentType}</p>
              <Button type="button" variant="outline" onClick={handleDownload}>
                <Download className="size-4" />
                Download to view
              </Button>
            </div>
          )}

          {!loading && !error && objectUrl && previewKind === "pdf" && (
            <iframe
              src={objectUrl}
              title={document?.filename ?? "Document preview"}
              className="h-full w-full border-0"
            />
          )}

          {!loading && !error && objectUrl && previewKind === "image" && (
            <img
              src={objectUrl}
              alt={document?.filename ?? "Document preview"}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
