"use client";

import React from "react";
import { FeatureCode, isFeatureInPlan } from "@/lib/permissions";
import { usePosStore } from "@/lib/pos-store";
import { Lock } from "lucide-react";
import Link from "next/link";

interface FeatureGateProps {
  feature: FeatureCode;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const currentTenant = usePosStore((state) => state.tenant);

  // If no tenant is loaded (e.g. during SSR or before mount), render nothing or fallback
  if (!currentTenant) return <>{fallback}</>;

  // Use fallback if plan is missing or doesn't have the feature
  const tenantPlan = currentTenant.plan || "BASIC";
  if (isFeatureInPlan(tenantPlan, feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
      <div className="bg-yellow-100 p-3 rounded-full mb-4">
        <Lock className="w-8 h-8 text-yellow-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Feature Locked</h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        This feature is only available on the PRO plan. Upgrade your subscription to unlock {feature.replace(/_/g, ' ')}.
      </p>
      <Link
        href="/settings/billing"
        className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Upgrade to PRO
      </Link>
    </div>
  );
}
