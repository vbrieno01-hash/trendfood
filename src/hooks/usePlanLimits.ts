import { useMemo } from "react";

type Plan = "free" | "pro" | "enterprise" | "lifetime";

type Feature = "kds" | "caixa" | "cupons" | "bestsellers" | "waiter" | "history_full" | "multi_unit" | "reports" | "addons" | "stock_ingredients" | "online_payment" | "pricing" | "loyalty" | "ai_bot" | "delivery_neighborhoods" | "thermal_printer" | "ifood" | "campaigns" | "intelligence_panel";

interface OrgLike {
  subscription_status?: string;
  subscription_plan?: string;
  trial_ends_at?: string | null;
  used_first_month_promo?: boolean;
  requires_ai_bot_addon?: boolean;
}

interface AiBotAddonLike {
  status?: string;
  current_period_end?: string | null;
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
  promoEligible: boolean;
}

const FEATURE_ACCESS: Record<Plan, Record<Feature, boolean>> = {
  free: {
    kds: false, caixa: false, cupons: false, bestsellers: false,
    waiter: false, history_full: false, multi_unit: false, reports: false,
    addons: false, stock_ingredients: false, online_payment: false, pricing: false, loyalty: false,
    ai_bot: false, delivery_neighborhoods: false, thermal_printer: false, ifood: false, campaigns: false,
    intelligence_panel: false,
  },
  pro: {
    kds: true, caixa: true, cupons: true, bestsellers: true,
    waiter: true, history_full: true, multi_unit: false, reports: false,
    addons: true, stock_ingredients: false, online_payment: true, pricing: false, loyalty: true,
    ai_bot: true, delivery_neighborhoods: true, thermal_printer: true, ifood: true, campaigns: true,
    intelligence_panel: false,
  },
  enterprise: {
    kds: true, caixa: true, cupons: true, bestsellers: true,
    waiter: true, history_full: true, multi_unit: true, reports: true,
    addons: true, stock_ingredients: true, online_payment: true, pricing: true, loyalty: true,
    ai_bot: true, delivery_neighborhoods: true, thermal_printer: true, ifood: true, campaigns: true,
    intelligence_panel: true,
  },
  lifetime: {
    kds: true, caixa: true, cupons: true, bestsellers: true,
    waiter: true, history_full: true, multi_unit: true, reports: true,
    addons: true, stock_ingredients: true, online_payment: true, pricing: true, loyalty: true,
    ai_bot: true, delivery_neighborhoods: true, thermal_printer: true, ifood: true, campaigns: true,
    intelligence_panel: true,
  },
};

export function usePlanLimits(
  organization: OrgLike | null | undefined,
  aiBotAddon?: AiBotAddonLike | null,
): PlanLimits {
  const rawPlan = (organization?.subscription_plan ?? "free") as Plan;
  const trialEndsAtStr = organization?.trial_ends_at ?? null;
  const usedPromo = organization?.used_first_month_promo ?? false;
  const requiresAiBotAddon = organization?.requires_ai_bot_addon ?? false;
  const addonStatus = aiBotAddon?.status ?? null;
  const addonPeriodEnd = aiBotAddon?.current_period_end ?? null;

  return useMemo(() => {
    const trialEndsAt = trialEndsAtStr ? new Date(trialEndsAtStr) : null;
    const now = new Date();
    const isPaid = rawPlan === "pro" || rawPlan === "enterprise";
    const subscriptionExpired = isPaid && !!trialEndsAt && trialEndsAt <= now;

    const trialActive = !!trialEndsAt && trialEndsAt > now && rawPlan === "free";
    const trialExpired = !!trialEndsAt && trialEndsAt <= now && rawPlan === "free";
    const trialDaysLeft = trialActive
      ? Math.max(0, Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const subscriptionDaysLeft = isPaid && !!trialEndsAt && trialEndsAt > now
      ? Math.max(0, Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const effectivePlan: Plan = rawPlan === "lifetime"
      ? "lifetime"
      : subscriptionExpired
        ? "free"
        : trialActive
          ? "pro"
          : rawPlan;

    const baseFeatures = FEATURE_ACCESS[effectivePlan];

    // Add-on gate: only affects orgs explicitly flagged as requires_ai_bot_addon.
    // For every other org, features remain exactly as before.
    let features = baseFeatures;
    if (requiresAiBotAddon && baseFeatures.ai_bot && effectivePlan !== "lifetime") {
      const periodEnd = addonPeriodEnd ? new Date(addonPeriodEnd) : null;
      const addonActive =
        addonStatus === "active" && (periodEnd === null || periodEnd > now);
      if (!addonActive) {
        features = { ...baseFeatures, ai_bot: false };
      }
    }

    // Promo do 1º mês (50% OFF) só faz sentido pra quem AINDA pode se tornar
    // assinante mensal Pro/Enterprise: Free puro, trial Pro ativo, ou Pro/Enterprise
    // com assinatura EXPIRADA. Lifetime NUNCA recebe (já tem tudo pra sempre).
    // Pro/Enterprise ATIVO também não recebe (já paga mensalidade).
    const promoEligible =
      !usedPromo &&
      rawPlan !== "lifetime" &&
      (rawPlan === "free" || subscriptionExpired);

    return {
      plan: rawPlan,
      effectivePlan,
      menuItemLimit: effectivePlan === "free" ? 30 : null,
      tableLimit: effectivePlan === "free" ? 1 : null,
      canAccess: (feature: Feature) => features[feature],
      features,
      trialActive,
      trialExpired,
      trialDaysLeft,
      subscriptionExpired,
      subscriptionDaysLeft,
      promoEligible,
    };
  }, [rawPlan, trialEndsAtStr, usedPromo, requiresAiBotAddon, addonStatus, addonPeriodEnd]);
}
