"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOfflineDetection } from "./useOfflineDetection";

type OfflineState = ReturnType<typeof useOfflineDetection>;

const OfflineContext = createContext<OfflineState | null>(null);

// Single provider — run detection once, share state with all consumers
export function OfflineProvider({ children }: { children: ReactNode }) {
  const value = useOfflineDetection();
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

// Hook for consumers — throws if used outside provider
export function useOfflineContext(): OfflineState {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOfflineContext must be used inside OfflineProvider");
  return ctx;
}
