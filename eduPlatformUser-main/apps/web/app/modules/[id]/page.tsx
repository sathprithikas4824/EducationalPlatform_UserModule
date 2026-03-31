"use client";

import { useParams } from "next/navigation";
import { Component, type ReactNode, useState, useEffect } from "react";
import Main from "../../components/modules/Main";
import OfflineLandingPage from "../../components/common/OfflineLandingPage";

// Error boundary — if the module page crashes offline, show the offline reader
interface EBState { crashed: boolean }
class ModuleErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) return <OfflineLandingPage />;
    return this.props.children;
  }
}

export default function ModulePage() {
  const params = useParams();
  const submoduleId = Number(params.id);

  // Show offline landing page immediately if browser reports offline
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOffline = () => setIsOnline(false);
    const goOnline  = () => setIsOnline(true);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  if (!isOnline) return <OfflineLandingPage />;

  return (
    <ModuleErrorBoundary>
      <Main submoduleId={submoduleId} />
    </ModuleErrorBoundary>
  );
}
