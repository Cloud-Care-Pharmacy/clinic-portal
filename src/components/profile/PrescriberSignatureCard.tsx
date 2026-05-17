"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import SignaturePad from "signature_pad";
import { toast } from "sonner";
import { Loader2, Eraser, Upload, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  useUpdatePractitionerSignature,
  useDeletePractitionerSignature,
} from "@/lib/hooks/use-practitioner";
import type {
  PractitionerSignature,
  SignatureCaptureMethod,
} from "@/types";

// Visual canvas dimensions (CSS px). Internal bitmap is scaled by DPR for
// crispness, then exported back at this logical size.
const PAD_WIDTH = 600;
const PAD_HEIGHT = 200;
const MAX_UPLOAD_BYTES = 1 * 1024 * 1024; // 1 MB
const ACCEPTED_MIMES = ["image/png", "image/svg+xml"];

interface PrescriberSignatureCardProps {
  signature: PractitionerSignature | null;
}

export function PrescriberSignatureCard({ signature }: PrescriberSignatureCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [pendingPreview, setPendingPreview] = useState<{
    dataUrl: string;
    mimeType: string;
    width: number;
    height: number;
    method: SignatureCaptureMethod;
  } | null>(null);
  const [isPadEmpty, setIsPadEmpty] = useState(true);

  const updateSignature = useUpdatePractitionerSignature();
  const deleteSignature = useDeletePractitionerSignature();

  // Init signature_pad once the draw tab is mounted.
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = PAD_WIDTH * dpr;
    canvas.height = PAD_HEIGHT * dpr;
    canvas.style.width = `${PAD_WIDTH}px`;
    canvas.style.height = `${PAD_HEIGHT}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    const pad = new SignaturePad(canvas, {
      penColor: "#111827",
      backgroundColor: "rgba(0,0,0,0)",
      minWidth: 0.6,
      maxWidth: 2.4,
    });
    padRef.current = pad;
    setIsPadEmpty(true);
    pad.addEventListener("endStroke", () => setIsPadEmpty(pad.isEmpty()));

    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [mode]);

  function handleClearPad() {
    padRef.current?.clear();
    setIsPadEmpty(true);
    setPendingPreview(null);
  }

  function handleCapturePad() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      toast.error("Please draw your signature first");
      return;
    }
    const dataUrl = pad.toDataURL("image/png");
    setPendingPreview({
      dataUrl,
      mimeType: "image/png",
      width: PAD_WIDTH,
      height: PAD_HEIGHT,
      method: "drawn",
    });
  }

  function handleFile(file: File) {
    if (!ACCEPTED_MIMES.includes(file.type)) {
      toast.error("Use a PNG or SVG image");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File must be 1 MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Could not read file");
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (!dataUrl.startsWith("data:")) {
        toast.error("Invalid image file");
        return;
      }
      // For PNG, measure intrinsic size; SVG renders at the displayed box.
      if (file.type === "image/png") {
        const img = new window.Image();
        img.onload = () => {
          setPendingPreview({
            dataUrl,
            mimeType: file.type,
            width: img.naturalWidth,
            height: img.naturalHeight,
            method: "uploaded",
          });
        };
        img.onerror = () => toast.error("Could not parse image");
        img.src = dataUrl;
      } else {
        setPendingPreview({
          dataUrl,
          mimeType: file.type,
          width: PAD_WIDTH,
          height: PAD_HEIGHT,
          method: "uploaded",
        });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!pendingPreview) return;
    updateSignature.mutate(pendingPreview, {
      onSuccess: () => {
        toast.success("Signature saved");
        setPendingPreview(null);
        padRef.current?.clear();
        setIsPadEmpty(true);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleDelete() {
    deleteSignature.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signature removed");
        setPendingPreview(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  const isSaving = updateSignature.isPending;
  const isDeleting = deleteSignature.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Prescriber signature
              {signature && (
                <Badge
                  variant="outline"
                  className="bg-status-success-bg text-status-success-fg border-status-success-border"
                >
                  On file
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Captured once and stamped automatically onto every prescription
              you issue. You will re-authenticate at issue time — your
              signature is never re-drawn per script.
            </CardDescription>
          </div>
          {signature && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove signature?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your stored signature will be revoked. You will not be able
                    to issue prescriptions until you capture a new one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current signature on file */}
        {signature && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Current signature</p>
            <div className="inline-flex items-center justify-center rounded-md border bg-muted/40 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed signature URL, not optimisable */}
              <Image
                src={signature.assetUrl}
                alt="Saved prescriber signature"
                width={signature.width}
                height={signature.height}
                className="max-h-32 w-auto"
                unoptimized
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Captured {new Date(signature.capturedAt).toLocaleString("en-AU")} ·{" "}
              {signature.method}
            </p>
          </div>
        )}

        {/* Capture area */}
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {signature ? "Replace signature" : "Capture signature"}
          </p>
          <Tabs value={mode} onValueChange={(v) => v && setMode(v as typeof mode)}>
            <TabsList>
              <TabsTrigger value="draw">
                <Pencil className="mr-2 size-4" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 size-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draw" className="space-y-3">
              <div className="inline-block rounded-md border bg-white">
                <canvas
                  ref={canvasRef}
                  className="block rounded-md touch-none"
                  aria-label="Signature pad"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearPad}
                  disabled={isPadEmpty && !pendingPreview}
                >
                  <Eraser className="mr-2 size-4" />
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCapturePad}
                  disabled={isPadEmpty}
                >
                  Preview
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use a stylus or trackpad for a cleaner signature.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center hover:bg-muted/50">
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Upload a PNG or SVG (transparent background recommended)
                </span>
                <span className="text-xs text-muted-foreground">
                  Max 1 MB
                </span>
                <input
                  type="file"
                  accept={ACCEPTED_MIMES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </TabsContent>
          </Tabs>
        </div>

        {/* Pending preview + save */}
        {pendingPreview && (
          <div className="space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-sm font-medium">Preview</p>
            <div className="inline-flex items-center justify-center rounded-md border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
              <img
                src={pendingPreview.dataUrl}
                alt="Signature preview"
                className="max-h-32 w-auto"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save signature
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPendingPreview(null)}
                disabled={isSaving}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
