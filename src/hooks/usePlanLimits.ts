type Plan = "free" | "pro" | "enterprise";

type Feature = "kds" | "caixa" | "cupons" | "bestsellers" | "waiter" | "history_full" | "multi_unit";

interface OrgLike {
  subscription_status?: string;
  subscription_plan?: string;
}

interface PlanLimits {
  plan: Plan;
  effectivePlan: Plan;
  menuItemLimit: number | null;
  tableLimit: number | null;
  canAccess: (feature: Feature) => boolean;
  features: Record<Feature, boolean>;
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
  const status = organization?.subscription_status ?? "trial";
  const rawPlan = (organization?.subscription_plan ?? "free") as Plan;

  // Trial users get pro-level access
  const effectivePlan: Plan = status === "trial" ? "pro" : rawPlan;

  const features = FEATURE_ACCESS[effectivePlan];

  return {
    plan: rawPlan,
    effectivePlan,
    menuItemLimit: effectivePlan === "free" ? 20 : null,
    tableLimit: effectivePlan === "free" ? 1 : null,
    canAccess: (feature: Feature) => features[feature],
    features,
  };
}
