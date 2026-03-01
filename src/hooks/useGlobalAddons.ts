import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalAddon {
  id: string;
  organization_id: string;
  name: string;
  price_cents: number;
  available: boolean;
  sort_order: number;
  created_at: string;
}

/** Available global addons for client-facing menu */
export function useGlobalAddons(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["global-addons", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("global_addons" as any)
        .select("*")
        .eq("organization_id", organizationId)
        .eq("available", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as GlobalAddon[];
    },
    enabled: !!organizationId,
  });
}
