type Plan = "free" | "pro" | "enterprise" | "lifetime";

type Feature = "kds" | "caixa" | "cupons" | "bestsellers" | "waiter" | "history_full" | "multi_unit" | "reports" | "addons" | "stock_ingredients" | "online_payment";

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
  subscriptionExpired: boolean;
  subscriptionDaysLeft: number;
}

const FEATURE_ACCESS: Record<Plan, Record<Feature, boolean>> = {
  free: {
    kds: false, caixa: false, cupons: false, bestsellers: false,
    waiter: false, history_full: false, multi_unit: false, reports: false,
    addons: false, stock_ingredients: false, online_payment: false,
  },
  pro: {
    kds: true, caixa: true, cupons: true, bestsellers: true,
    waiter: true, history_full: true, multi_unit: false, reports: false,
    addons: true, stock_ingredients: false, online_payment: true,
  },
  enterprise: {
    kds: true, caixa: true, cupons: true, bestsellers: true,
    waiter: true, history_full: true, multi_unit: true, reports: true,
    addons: true, stock_ingredients: true, online_payment: true,
  },
  lifetime: {
    kds: true, caixa: true, cupons: true, bestsellers: true,
    waiter: true, history_full: true, multi_unit: true, reports: true,
    addons: true, stock_ingredients: true, online_payment: true,
  },
};

export function usePlanLimits(organization: OrgLike | null | undefined): PlanLimits {
  const rawPlan = (organization?.subscription_plan ?? "free") as Plan;

  const trialEndsAt = organization?.trial_ends_at ? new Date(organization.trial_ends_at) : null;
  const now = new Date();
  // Para planos pagos: trial_ends_at funciona como data de expiração
  const isPaid = rawPlan === "pro" || rawPlan === "enterprise";
  const subscriptionExpired = isPaid && !!trialEndsAt && trialEndsAt <= now;

  // Trial continua funcionando igual para plano free
  const trialActive = !!trialEndsAt && trialEndsAt > now && rawPlan === "free";
  const trialExpired = !!trialEndsAt && trialEndsAt <= now && rawPlan === "free";
  const trialDaysLeft = trialActive
    ? Math.max(0, Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Dias restantes da assinatura paga
  const subscriptionDaysLeft = isPaid && !!trialEndsAt && trialEndsAt > now
    ? Math.max(0, Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Se plano pago expirou, trata como free
  const effectivePlan: Plan = rawPlan === "lifetime"
    ? "lifetime"
    : subscriptionExpired
      ? "free"
      : trialActive
        ? "pro"
        : rawPlan;

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
    subscriptionExpired,
    subscriptionDaysLeft,
  };
}
