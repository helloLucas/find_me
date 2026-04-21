import type { PropsWithChildren } from "react";
import FullscreenEnforcer from "../../shared/ui/FullscreenEnforcer/FullscreenEnforcer";

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-black text-white relative">
      <FullscreenEnforcer />
      {children}
    </div>
  );
}
