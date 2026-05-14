import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformFeatureFlags {
  ifood_enabled: boolean;
}

export function usePlatformFeatureFlags() {
  return useQuery({
    queryKey: ["platform_feature_flags"],
    queryFn: async (): Promise<PlatformFeatureFlags> => {
      const { data, error } = await supabase
        .from("platform_config")
        .select("ifood_enabled")
        .eq("id", "singleton")
        .maybeSingle();
      if (error) throw error;
      return { ifood_enabled: !!(data as any)?.ifood_enabled };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdatePlatformFeatureFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PlatformFeatureFlags>) => {
      const { error } = await supabase
        .from("platform_config")
        .update(patch as any)
        .eq("id", "singleton");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform_feature_flags"] });
    },
  });
}