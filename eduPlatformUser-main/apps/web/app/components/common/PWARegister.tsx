"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.error("[PWA] Service worker registration failed:", err);
      });

    // When the SW updates and sends SW_ACTIVATED, reload the page so the new
    // JS bundle (with video playback fixes) is picked up without manual refresh.
    navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
      if (event.data?.type === "SW_ACTIVATED") {
        window.location.reload();
      }
    });
  }, []);

  return null;
}
