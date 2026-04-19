import { supabase } from "@/integrations/supabase/client";

/**
 * Hard-stop validation for the Free plan menu item cap.
 * Returns the effective limit (number) if a cap applies, or null if unlimited.
 * Throws an Error if the limit is already reached or would be exceeded by `addingCount`.
 */
export async function assertMenuItemLimit(
  orgId: string,
  addingCount: number = 1
): Promise<number | null> {
  // Fetch plan + trial info
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("subscription_plan, trial_ends_at")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw orgErr;
  if (!org) throw new Error("Organização não encontrada.");

  const plan = (org.subscription_plan ?? "free") as string;
  const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const now = new Date();
  const trialActive = !!trialEndsAt && trialEndsAt > now && plan === "free";
  const subscriptionExpired =
    (plan === "pro" || plan === "enterprise") && !!trialEndsAt && trialEndsAt <= now;

  const effectivePlan =
    plan === "lifetime"
      ? "lifetime"
      : subscriptionExpired
        ? "free"
        : trialActive
          ? "pro"
          : plan;

  const limit = effectivePlan === "free" ? 30 : null;
  if (limit == null) return null;

  // Count current items
  const { count, error: countErr } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  if (countErr) throw countErr;

  const current = count ?? 0;
  if (current + addingCount > limit) {
    throw new Error(
      `Limite do plano Grátis atingido (${limit} itens). Faça upgrade para adicionar mais.`
    );
  }
  return limit;
}
