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
