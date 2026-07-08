import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna se a loja tem NFC-e ativa E liberada para produção.
 * Usado na vitrine (checkout) para decidir se mostra os campos
 * opcionais de CPF/CNPJ e e-mail do cliente.
 *
 * Fonte: função SECURITY DEFINER `public.get_fiscal_public_status(uuid)`
 * — expõe apenas os 2 booleans, nada sensível.
 */
export const useFiscalPublicStatus = (orgId: string | undefined) => {
  return useQuery({
    queryKey: ["fiscal-public-status", orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!orgId) return { enabled: false, producao_liberada: false };
      const { data, error } = await supabase.rpc("get_fiscal_public_status", {
        _org_id: orgId,
      });
      if (error) {
        // fail-closed: em erro, esconde o bloco
        return { enabled: false, producao_liberada: false };
      }
      const row = Array.isArray(data) ? data[0] : data;
      return {
        enabled: !!row?.enabled,
        producao_liberada: !!row?.producao_liberada,
      };
    },
  });
};