type Plan = "free" | "pro" | "enterprise";

type Feature = "kds" | "caixa" | "cupons" | "bestsellers" | "waiter" | "history_full" | "multi_unit";

interface OrgLike {
  subscription_status?: string;
  subscription_plan?: string;
  trial_ends_at?: string | null;
}

interface PlanLimits {
  plan: Plan;
  effectivePlan: Plan;
  menuItemLimit: number | null;
  tableLimit: number | null;
  canAccess: (feature: Feature) => boolean;
  features: Record<Feature, boolean>;
  trialActive: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
}

const FEATURE_ACCESS: Record<Plan, Record<Feature, boolean>> = {
  free: {
    kds: false,
    caixa: false,
    cupons: false,
    bestsellers: false,
    waiter: false,
    history_full: false,
    multi_unit: false,
  },
  pro: {
    kds: true,
    caixa: true,
    cupons: true,
    bestsellers: true,
    waiter: true,
    history_full: true,
    multi_unit: false,
  },
  enterprise: {
    kds: true,
    caixa: true,
    cupons: true,
    bestsellers: true,
    waiter: true,
    history_full: true,
    multi_unit: true,
  },
};

export function usePlanLimits(organization: OrgLike | null | undefined): PlanLimits {
  const rawPlan = (organization?.subscription_plan ?? "free") as Plan;

  const trialEndsAt = organization?.trial_ends_at ? new Date(organization.trial_ends_at) : null;
  const now = new Date();
  const trialActive = !!trialEndsAt && trialEndsAt > now;
  const trialExpired = !!trialEndsAt && trialEndsAt <= now;
  const trialDaysLeft = trialActive
    ? Math.max(0, Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const effectivePlan: Plan = trialActive ? "pro" : rawPlan;

  const features = FEATURE_ACCESS[effectivePlan];

  return {
    plan: rawPlan,
    effectivePlan,
    menuItemLimit: effectivePlan === "free" ? 20 : null,
    tableLimit: effectivePlan === "free" ? 1 : null,
    canAccess: (feature: Feature) => features[feature],
    features,
    trialActive,
    trialExpired,
    trialDaysLeft,
  };
}
