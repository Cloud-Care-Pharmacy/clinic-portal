"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Template } from "@/types";

interface SendTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

function defaultRecipient(
  template: Template,
  user: ReturnType<typeof useUser>["user"]
): string {
  if (template.type === "email") {
    return user?.primaryEmailAddress?.emailAddress ?? "";
  }
  if (template.type === "sms") {
    return user?.primaryPhoneNumber?.phoneNumber ?? "";
  }
  return user?.fullName ?? "Me";
}

export function SendTestDialog({ open, onOpenChange, template }: SendTestDialogProps) {
  const { user } = useUser();
  const [recipient, setRecipient] = useState("");
  // Derived-state reset when the (open, template) tuple changes.
  const trackerKey = `${open ? "o" : "c"}|${template?.id ?? ""}`;
  const [trackedKey, setTrackedKey] = useState<string>("");
  if (open && template && trackedKey !== trackerKey) {
    setTrackedKey(trackerKey);
    setRecipient(defaultRecipient(template, user));
  }

  if (!template) return null;

  const recipientLabel =
    template.type === "email"
      ? "Email address"
      : template.type === "sms"
        ? "Phone number"
        : "Recipient name";
  const placeholder =
    template.type === "email"
      ? "you@example.com"
      : template.type === "sms"
        ? "+61 412 345 678"
        : "Recipient";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send test {template.type}</AlertDialogTitle>
          <AlertDialogDescription>
            This is a mock send. No real {template.type} will be delivered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="test-recipient">{recipientLabel}</Label>
          <Input
            id="test-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              const trimmed = recipient.trim();
              if (!trimmed) {
                toast.error(`${recipientLabel} is required`);
                return;
              }
              toast.success(`Test ${template.type} sent (mock) to ${trimmed}`);
              onOpenChange(false);
            }}
          >
            Send test
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
