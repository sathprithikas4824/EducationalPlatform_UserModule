"use client";

import { useParams } from "next/navigation";
import { Component, type ReactNode } from "react";
import Main from "../../components/modules/Main";
import OfflineLandingPage from "../../components/common/OfflineLandingPage";
import OnlineGate from "../../components/common/OnlineGate";

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

  return (
    <OnlineGate>
      <ModuleErrorBoundary>
        <Main submoduleId={submoduleId} />
      </ModuleErrorBoundary>
    </OnlineGate>
  );
}
