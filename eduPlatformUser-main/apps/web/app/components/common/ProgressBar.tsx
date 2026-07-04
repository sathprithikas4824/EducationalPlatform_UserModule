"use client";

import React from "react";

interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  showText?: boolean;
  className?: string;
  color?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showText = true,
  className = "",
  color = "bg-purple-600",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{label}</span>
          <span aria-hidden="true">{pct}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuetext={`${pct}% complete`}
          aria-label={label}
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
