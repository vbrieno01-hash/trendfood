import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FiscalQuota {
  plan: string;
  used: number;
  quota: number | null;
  remaining: number | null;
  blocked: boolean;
  reason: string | null;
  overage_allowed: boolean;
  overage_price_cents: number | null;
}

/** Consulta a RPC public.fiscal_check_quota. Retorna null enquanto orgId não existe. */
export function useFiscalQuota(orgId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["fiscal_quota", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.rpc("fiscal_check_quota", { _org_id: orgId });
      if (error) throw error;
      return (data as unknown) as FiscalQuota;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });

  // Invalida quota sempre que uma nota fiscal muda de status
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`fiscal_quota_watch:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fiscal_invoices", filter: `organization_id=eq.${orgId}` },
        () => { qc.invalidateQueries({ queryKey: ["fiscal_quota", orgId] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

  return query;
}