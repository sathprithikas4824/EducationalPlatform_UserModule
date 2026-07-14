"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccessibility } from "../../context/AccessibilityContext";

// Next.js App Router has no built-in announcement for client-side navigations —
// unlike a full page load, a screen reader gets no signal that the page changed.
// This announces the new page's title and moves focus back to <main> on every
// route change (skipping the very first mount, which is a real page load already
// announced by the browser itself).
export default function RouteAnnouncer() {
  const pathname = usePathname();
  const { announce } = useAccessibility();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Give Next.js a tick to update document.title for the new route
    const timer = setTimeout(() => {
      announce(`Navigated to ${document.title || "page"}.`);
      document.getElementById("main-content")?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname, announce]);

  return null;
}