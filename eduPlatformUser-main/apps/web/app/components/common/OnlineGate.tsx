"use client";

import { type ReactNode } from "react";
import OfflineLandingPage from "./OfflineLandingPage";
import { useOfflineContext } from "./OfflineContext";

// ── OnlineGate — blocks children using shared OfflineContext ──────────────────
// Popup is handled once by GlobalOfflineGuard in the root layout.
export default function OnlineGate({ children }: { children: ReactNode }) {
  const { isOnline, wasOffline, confirmed } = useOfflineContext();

  if (isOnline === null) return null;

  // Still offline, or back online but user hasn't confirmed yet
  if (!isOnline || (wasOffline && !confirmed)) return <OfflineLandingPage />;

  return <>{children}</>;
}
