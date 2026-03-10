"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WritePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-void">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-text-ghost border-t-amber rounded-full animate-spin" />
        <p className="text-xs text-text-ghost">Redirecting...</p>
      </div>
    </div>
  );
}
