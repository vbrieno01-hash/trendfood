import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignCredits {
  id: string;
  organization_id: string;
  plan_id: string;
  credits_total: number;
  credits_used: number;
  period_start: string;
  period_end: string;
  mp_subscription_id: string | null;
  status: "active" | "canceled" | "expired" | "trial";
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  target_filter: { inactive_days?: number };
  message_template: string;
  coupon_id: string | null;
  total_recipients: number;
  sent_count: number;
  status: "draft" | "sending" | "completed" | "failed" | "canceled";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function useCampaignCredits(orgId: string | undefined) {
  return useQuery({
    queryKey: ["campaign_credits", orgId],
    queryFn: async (): Promise<CampaignCredits | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("campaign_credits")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data as CampaignCredits | null;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useCampaigns(orgId: string | undefined) {
  return useQuery({
    queryKey: ["campaigns", orgId],
    queryFn: async (): Promise<Campaign[]> => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
    enabled: !!orgId,
    staleTime: 15_000,
  });
}

export function useInactiveCustomersCount(orgId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["inactive_customers_count", orgId, days],
    queryFn: async (): Promise<number> => {
      if (!orgId) return 0;
      const { data, error } = await supabase.rpc("count_inactive_customers", {
        _organization_id: orgId,
        _inactive_days: days,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useCreateAndSendCampaign(orgId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      inactive_days: number;
      message_template: string;
    }) => {
      if (!orgId) throw new Error("no_org");

      // 1) Busca telefones dos inativos
      const { data: recipients, error: rErr } = await supabase.rpc(
        "get_inactive_customers",
        { _organization_id: orgId, _inactive_days: input.inactive_days }
      );
      if (rErr) throw rErr;
      const phones = ((recipients ?? []) as Array<{ phone: string }>).map((r) => r.phone);
      if (phones.length === 0) throw new Error("no_recipients");

      // 2) Cria campanha (draft)
      const { data: campaign, error: cErr } = await supabase
        .from("campaigns")
        .insert({
          organization_id: orgId,
          name: input.name,
          target_filter: { inactive_days: input.inactive_days },
          message_template: input.message_template,
          total_recipients: phones.length,
          status: "draft",
        })
        .select()
        .single();
      if (cErr) throw cErr;

      // 3) Insere recipients (unique por phone)
      const uniquePhones = Array.from(new Set(phones));
      const { error: rInsErr } = await supabase.from("campaign_recipients").insert(
        uniquePhones.map((phone) => ({
          campaign_id: campaign.id,
          organization_id: orgId,
          phone,
          status: "pending",
        }))
      );
      if (rInsErr) throw rInsErr;

      // 4) Chama RPC atômica que valida saldo, debita e enfileira na outbox
      const { data: result, error: eErr } = await supabase.rpc("enqueue_campaign", {
        _campaign_id: campaign.id,
      });
      if (eErr) throw eErr;

      return result as {
        ok: boolean;
        error?: string;
        enqueued?: number;
        skipped?: number;
        remaining_credits?: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns", orgId] });
      qc.invalidateQueries({ queryKey: ["campaign_credits", orgId] });
    },
  });
}