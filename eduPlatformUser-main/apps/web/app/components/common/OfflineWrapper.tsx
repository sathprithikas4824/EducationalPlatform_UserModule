"use client";

import { useEffect, useState } from "react";
import Main from "../moduleFirstPage/Main";
import OfflineLandingPage from "./OfflineLandingPage";

export default function OfflineWrapper() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Set initial state from browser
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // During SSR / before hydration, render nothing to avoid mismatch
  if (isOnline === null) return null;

  if (!isOnline) return <OfflineLandingPage />;

  return <Main />;
}
