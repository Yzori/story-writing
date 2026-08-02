"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/shared/Toast";
import ContinuityImporter from "@/components/shared/ContinuityImporter";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <ContinuityImporter />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
