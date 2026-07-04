import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FiscalInvoice {
  id: string;
  order_id: string;
  organization_id: string;
  status: string; // pending | processing | authorized | rejected | cancelled
  numero: number | null;
  serie: number | null;
  chave_acesso: string | null;
  danfe_url: string | null;
  xml_url: string | null;
  qrcode_url: string | null;
  emitted_at: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  cancel_reason: string | null;
  environment: string;
  created_at: string;
  updated_at: string;
}

export function useFiscalStatus(orgId: string | undefined) {
  return useQuery({
    queryKey: ["fiscal_status", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase.from("fiscal_config")
        .select("enabled, environment, cnpj, certificado_uploaded_at")
        .eq("organization_id", orgId).maybeSingle();
      return data;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useFiscalInvoices(orgId: string | undefined, opts?: { since?: string }) {
  return useQuery({
    queryKey: ["fiscal_invoices", orgId, opts?.since ?? "all"],
    queryFn: async () => {
      if (!orgId) return [] as FiscalInvoice[];
      let q = supabase.from("fiscal_invoices")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (opts?.since) q = q.gte("created_at", opts.since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FiscalInvoice[];
    },
    enabled: !!orgId,
    staleTime: 5_000,
  });
}

export function useFiscalInvoicesRealtime(orgId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`fiscal_invoices:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fiscal_invoices", filter: `organization_id=eq.${orgId}` },
        () => { qc.invalidateQueries({ queryKey: ["fiscal_invoices", orgId] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);
}