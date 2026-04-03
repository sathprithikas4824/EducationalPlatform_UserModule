"use client";

import { type ReactNode } from "react";
import OfflineLandingPage from "./OfflineLandingPage";
import { useOfflineDetection } from "./useOfflineDetection";

// ── OnlineGate — blocks children when offline ─────────────────────────────────
// The back-online popup is handled globally by GlobalOfflineGuard in the layout.
export default function OnlineGate({ children }: { children: ReactNode }) {
  const { isOnline, wasOffline, confirmed } = useOfflineDetection();

  // SSR guard — render nothing until first connectivity check resolves
  if (isOnline === null) return null;

  // Still offline, or back online but user hasn't confirmed yet — block content
  if (!isOnline || (wasOffline && !confirmed)) return <OfflineLandingPage />;

  return <>{children}</>;
}
