"use client";

import { type ReactNode } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Matches the id of a visible heading inside the modal for aria-labelledby */
  "aria-labelledby"?: string;
  /** Use when there is no visible heading */
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible modal wrapper.
 * - role="dialog" + aria-modal="true" so screen readers announce it.
 * - Focus trapped inside (Tab loops, Shift+Tab goes back).
 * - Escape fires onClose.
 * - Focus returns to the trigger element on close.
 */
export default function Modal({
  isOpen,
  onClose,
  "aria-labelledby": labelledBy,
  "aria-label": label,
  children,
  className = "",
}: ModalProps) {
  const ref = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — not focusable, click closes modal */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Dialog panel */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={!labelledBy ? label : undefined}
        className={`relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 sm:p-8 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
