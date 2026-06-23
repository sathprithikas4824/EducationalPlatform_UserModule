import React from "react";

// TypeScript makes aria-label REQUIRED — impossible to create an icon button without it.
// Use this component for every button that contains only an icon (no visible text).

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: text description read by screen readers (e.g. "Bookmark this topic") */
  "aria-label": string;
  /** For toggle buttons: true = pressed/active, false = not pressed */
  "aria-pressed"?: boolean;
  children: React.ReactNode;
}

export default function IconButton({
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      {...props}
    >
      {children}
    </button>
  );
}
