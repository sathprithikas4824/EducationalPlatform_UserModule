"use client";

import { useAccessibility } from "../../context/AccessibilityContext";

const FONT_SIZES = [
  { value: "normal" as const, label: "Normal" },
  { value: "large" as const, label: "Large" },
  { value: "xl" as const, label: "Extra Large" },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
        checked ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function AccessibilitySettings() {
  const {
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    fontSize,
    setFontSize,
    announce,
  } = useAccessibility();

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 hc:text-white">
        Accessibility
      </h2>

      {/* High Contrast */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 hc:bg-black rounded-xl border border-gray-200 dark:border-gray-700 hc:border-white">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 hc:text-white">High Contrast</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hc:text-yellow-300 mt-0.5">
            Black background, white text, yellow accents — for low vision or light sensitivity
          </p>
        </div>
        <Toggle
          checked={highContrast}
          label="Toggle high contrast mode"
          onChange={(value) => {
            setHighContrast(value);
            announce(`High contrast ${value ? "enabled" : "disabled"}`);
          }}
        />
      </div>

      {/* Reduce Animations */}
      <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 hc:bg-black rounded-xl border border-gray-200 dark:border-gray-700 hc:border-white">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 hc:text-white">Reduce Animations</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hc:text-yellow-300 mt-0.5">
            Turns off motion and transition effects across the platform
          </p>
        </div>
        <Toggle
          checked={reducedMotion}
          label="Toggle reduced animations"
          onChange={(value) => {
            setReducedMotion(value);
            announce(`Reduced animations ${value ? "enabled" : "disabled"}`);
          }}
        />
      </div>

      {/* Font Size */}
      <div className="p-4 bg-white dark:bg-gray-900 hc:bg-black rounded-xl border border-gray-200 dark:border-gray-700 hc:border-white">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 hc:text-white mb-1">Text Size</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 hc:text-yellow-300 mb-3">
          Increase text size across the entire platform
        </p>
        <div role="radiogroup" aria-label="Text size" className="flex gap-2">
          {FONT_SIZES.map(({ value, label }) => {
            const isActive = fontSize === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={isActive}
                onClick={() => {
                  setFontSize(value);
                  announce(`Text size set to ${label}`);
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-colors ${
                  isActive
                    ? "bg-purple-600 hc:bg-yellow-400 text-white hc:text-black border-purple-600 hc:border-yellow-400"
                    : "bg-white dark:bg-gray-900 hc:bg-black text-gray-700 dark:text-gray-300 hc:text-white border-gray-200 dark:border-gray-700 hc:border-white hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 hc:text-yellow-300">
        Settings are saved automatically and sync across your devices when logged in.
      </p>
    </div>
  );
}
