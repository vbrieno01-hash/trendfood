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
  // pix_key removed from public query — use edge function generate-pix-payload
  store_address?: string | null;
  delivery_config?: DeliveryConfig | null;
  pix_confirmation_mode?: "direct" | "manual" | "automatic";
  subscription_status?: string;
  subscription_plan?: string;
  trial_ends_at?: string | null;
  paused?: boolean;
  printer_width?: '58mm' | '80mm';
  banner_url?: string | null;
  courier_config?: { base_fee: number; per_km: number } | null;
  print_mode?: 'browser' | 'desktop' | 'bluetooth';
  cnpj?: string | null;
}

export const useOrganization = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["organization", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug");
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, description, emoji, primary_color, logo_url, whatsapp, business_hours, store_address, delivery_config, pix_confirmation_mode, paused, printer_width, banner_url, courier_config, print_mode, cnpj, subscription_status, subscription_plan, trial_ends_at")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Organization | null;
    },
    enabled: !!slug,
  });
};
