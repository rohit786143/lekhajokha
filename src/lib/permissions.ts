import { TenantPlan, SubscriptionStatus } from "./types";

export type FeatureCode =
  | "basic_billing"
  | "gst_invoice"
  | "single_gstin"
  | "multi_gstin"
  | "eway_bill"
  | "basic_inventory"
  | "batch_inventory"
  | "expiry_tracking"
  | "multi_location_inventory"
  | "pos"
  | "multi_branch"
  | "advanced_users"
  | "basic_reports"
  | "advanced_reports"
  | "business_analytics"
  | "gst_analytics"
  | "inventory_analytics"
  | "branch_analytics";

const PLAN_FEATURES: Record<TenantPlan, FeatureCode[]> = {
  BASIC: [
    "basic_billing",
    "gst_invoice",
    "single_gstin",
    "basic_inventory",
    "basic_reports",
  ],
  PRO: [
    "basic_billing",
    "gst_invoice",
    "single_gstin",
    "multi_gstin",
    "eway_bill",
    "basic_inventory",
    "batch_inventory",
    "expiry_tracking",
    "multi_location_inventory",
    "pos",
    "multi_branch",
    "advanced_users",
    "basic_reports",
    "advanced_reports",
    "business_analytics",
    "gst_analytics",
    "inventory_analytics",
    "branch_analytics",
  ],
  ENTERPRISE: [
    "basic_billing",
    "gst_invoice",
    "single_gstin",
    "multi_gstin",
    "eway_bill",
    "basic_inventory",
    "batch_inventory",
    "expiry_tracking",
    "multi_location_inventory",
    "pos",
    "multi_branch",
    "advanced_users",
    "basic_reports",
    "advanced_reports",
    "business_analytics",
    "gst_analytics",
    "inventory_analytics",
    "branch_analytics",
  ],
};

export function hasFeature(
  plan: TenantPlan,
  status: SubscriptionStatus,
  feature: FeatureCode
): boolean {
  // If subscription is not active, deny all access except maybe basic read-only
  // For this implementation, we will strictly enforce ACTIVE status for write actions/advanced features.
  // The UI will handle read-only mode for expired accounts.
  
  const allowedFeatures = PLAN_FEATURES[plan] || [];
  return allowedFeatures.includes(feature);
}

// Overload to check if the plan has the feature regardless of status, mainly for UI display
export function isFeatureInPlan(plan: TenantPlan, feature: FeatureCode): boolean {
  return (PLAN_FEATURES[plan] || []).includes(feature);
}
