import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DeliveryConfig, DEFAULT_DELIVERY_CONFIG } from "@/hooks/useDeliveryFee";

export function usePlatformDeliveryConfig() {
  return useQuery({
    queryKey: ["platform_config"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("platform_config")
        .select("delivery_config")
        .eq("id", "singleton")
        .single();
      if (error) throw error;
      const raw = (data as { delivery_config: DeliveryConfig } | null)?.delivery_config;
      return raw ? { ...DEFAULT_DELIVERY_CONFIG, ...raw } : DEFAULT_DELIVERY_CONFIG;
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}

export function useUpdatePlatformDeliveryConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: DeliveryConfig) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("platform_config")
        .update({ delivery_config: config })
        .eq("id", "singleton");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_config"] });
    },
  });
}
