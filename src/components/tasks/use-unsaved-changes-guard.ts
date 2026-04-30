"use client";

import { useEffect } from "react";

interface UnsavedChangesGuardOptions {
  active: boolean;
  message: string;
  onConfirmLeave?: () => void;
}

function isPrimaryClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function findAnchor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLAnchorElement>("a[href]");
}

function isNavigationAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (/^(javascript|mailto|tel|sms):/i.test(href)) return false;

  const nextUrl = new URL(anchor.href, window.location.href);
  return nextUrl.href !== window.location.href;
}

export function useUnsavedChangesGuard({
  active,
  message,
  onConfirmLeave,
}: UnsavedChangesGuardOptions) {
  useEffect(() => {
    if (!active) return;

    const currentUrl = window.location.href;
    let confirmedLeave = false;

    function confirmLeave() {
      const confirmed = window.confirm(message);
      if (confirmed) {
        confirmedLeave = true;
        onConfirmLeave?.();
      }
      return confirmed;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (confirmedLeave) return;

      event.preventDefault();
      event.returnValue = "";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!isPrimaryClick(event)) return;

      const anchor = findAnchor(event.target);
      if (!anchor || !isNavigationAnchor(anchor)) return;

      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function handlePopState() {
      if (!confirmLeave()) {
        window.history.pushState(null, "", currentUrl);
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [active, message, onConfirmLeave]);
}
