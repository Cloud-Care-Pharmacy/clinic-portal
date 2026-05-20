"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ViewJsonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: unknown;
}

export function ViewJsonDialog({ open, onOpenChange, data }: ViewJsonDialogProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  function copy() {
    void navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success("JSON copied");
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Workflow JSON</DialogTitle>
          <DialogDescription>
            Read-only export of the saved workflow record.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-sm border border-border bg-card p-3 font-mono text-xs">
          {json}
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={copy}>
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy JSON"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
