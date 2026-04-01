"use client";

import { Component, type ReactNode } from "react";
import Main from "../moduleFirstPage/Main";
import OfflineLandingPage from "./OfflineLandingPage";
import OnlineGate from "./OnlineGate";

// ── Error boundary — catches any crash and shows offline page if offline ───────
interface EBState { crashed: boolean }
class OfflineErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) return <OfflineLandingPage />;
    return this.props.children;
  }
}

export default function OfflineWrapper() {
  return (
    <OnlineGate>
      <OfflineErrorBoundary>
        <Main />
      </OfflineErrorBoundary>
    </OnlineGate>
  );
}
