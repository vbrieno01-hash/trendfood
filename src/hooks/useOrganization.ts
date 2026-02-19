import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessHoursDay {
  open: boolean;
  from: string;
  to: string;
}

export interface BusinessHours {
  enabled: boolean;
  schedule: Record<string, BusinessHoursDay>;
}

export interface DeliveryConfig {
  fee_tier1: number;
  fee_tier2: number;
  fee_tier3: number;
  tier1_km: number;
  tier2_km: number;
  free_above: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  user_id: string;
  created_at: string;
  whatsapp?: string | null;
  business_hours?: BusinessHours | null;
  pix_key?: string | null;
  store_address?: string | null;
  delivery_config?: DeliveryConfig | null;
  subscription_status?: string;
  subscription_plan?: string;
}

export const useOrganization = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["organization", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug");
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Organization | null;
    },
    enabled: !!slug,
  });
};
