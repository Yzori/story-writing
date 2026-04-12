"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { UpgradePrompt } from "./UpgradePrompt";

interface FeatureGateProps {
  children: ReactNode;
  feature: string;
  tier: "pro" | "premium";
  fallback?: ReactNode;
  showPrompt?: boolean;
}

/**
 * Wrapper component that gates features based on subscription tier
 * Usage:
 *   <FeatureGate feature="AI Assistant" tier="pro">
 *     <AIButton />
 *   </FeatureGate>
 */
export function FeatureGate({
  children,
  feature,
  tier,
  fallback,
  showPrompt = true,
}: FeatureGateProps) {
  const { data: session } = useSession();

  // Check if user has required tier
  const userTier = (session?.user as any)?.subscriptionTier || "free";
  const hasAccess =
    (tier === "pro" && (userTier === "pro" || userTier === "premium")) ||
    (tier === "premium" && userTier === "premium");

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Otherwise show upgrade prompt
  if (showPrompt) {
    return <UpgradePrompt feature={feature} tier={tier} />;
  }

  // Don't render anything
  return null;
}

/**
 * Hook to check if user has access to a feature
 */
export function useFeatureAccess(tier: "pro" | "premium"): boolean {
  const { data: session } = useSession();
  const userTier = (session?.user as any)?.subscriptionTier || "free";

  if (tier === "pro") {
    return userTier === "pro" || userTier === "premium";
  }

  return userTier === "premium";
}
