import type { PropsWithChildren } from "react";

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
    </div>
  );
}
