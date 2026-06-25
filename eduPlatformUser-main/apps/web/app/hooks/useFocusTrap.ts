"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside a container while isOpen is true.
 * - Focuses the first focusable element on open.
 * - Tab / Shift+Tab cycle only within the container.
 * - Escape fires onClose.
 * - On close, focus returns to whichever element triggered the modal.
 */
export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (container) {
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      focusables[0]?.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== "Tab") return;

      const c = containerRef.current;
      if (!c) return;
      const focusables = Array.from(c.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return containerRef;
}
