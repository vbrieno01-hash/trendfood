import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsappConnected(orgId?: string) {
  return useQuery({
    queryKey: ["whatsapp_connected", orgId],
    enabled: !!orgId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id,status")
        .eq("organization_id", orgId!)
        .eq("status", "connected")
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });
}