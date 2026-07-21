"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useAccessibility } from "../../context/AccessibilityContext";

interface Shortcut {
  keys: string;
  description: string;
}

// Only documents shortcuts that actually exist elsewhere in the app —
// nothing invented here that isn't real, wired-up behavior.
const SHORTCUTS: Shortcut[] = [
  { keys: "Tab", description: "Move to the next interactive element" },
  { keys: "Shift + Tab", description: "Move to the previous interactive element" },
  { keys: "Enter / Space", description: "Activate the focused button or link" },
  { keys: "Escape", description: "Close the open dialog or panel" },
  { keys: "?", description: "Open this shortcuts panel" },
];

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const { announce } = useAccessibility();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "?") return;

      // Don't hijack "?" while the user is typing it into a field
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      e.preventDefault();
      setIsOpen(true);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    announce("Keyboard shortcuts panel closed.");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} aria-labelledby="keyboard-shortcuts-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="keyboard-shortcuts-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Keyboard Shortcuts
        </h2>
        <button
          onClick={handleClose}
          aria-label="Close keyboard shortcuts panel"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <dl className="space-y-3">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between gap-4">
            <dt>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                {s.keys}
              </kbd>
            </dt>
            <dd className="text-sm text-gray-600 dark:text-gray-300 text-right">{s.description}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}