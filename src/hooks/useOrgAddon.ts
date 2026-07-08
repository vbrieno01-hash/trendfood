import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrgAddon {
  id: string;
  addon_key: string;
  status: "pending" | "active" | "past_due" | "cancelled";
  price_monthly: number;
  billing_day: number;
  current_period_end: string | null;
  mp_preapproval_id: string | null;
}

/**
 * Fetch a specific add-on row for an organization.
 * Returns null if the org has no such add-on registered.
 * Read-only hook — writes happen via edge functions / admin panel.
 */
export function useOrgAddon(orgId: string | null | undefined, addonKey: string) {
  return useQuery({
    queryKey: ["org-addon", orgId, addonKey],
    queryFn: async (): Promise<OrgAddon | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("org_addons")
        .select("id, addon_key, status, price_monthly, billing_day, current_period_end, mp_preapproval_id")
        .eq("organization_id", orgId)
        .eq("addon_key", addonKey)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as OrgAddon) ?? null;
    },
    enabled: !!orgId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}