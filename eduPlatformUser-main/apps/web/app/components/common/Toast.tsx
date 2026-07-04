"use client";

import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
  duration?: number;
}

const STYLES: Record<ToastType, string> = {
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-700 dark:text-green-200",
  error:   "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-700 dark:text-red-200",
  info:    "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-200",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-200",
};

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
  if (type === "error") return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.732-.834-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
  if (type === "warning") return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.732-.834-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function Toast({ message, type, onDismiss, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={`fixed bottom-4 right-4 z-[9999] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm w-full sm:w-auto ${STYLES[type]}`}
    >
      <ToastIcon type={type} />
      <p className="text-sm font-medium flex-1 leading-snug">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
