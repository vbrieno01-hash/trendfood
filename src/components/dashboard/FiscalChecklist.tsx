import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export type ChecklistItem = { item: string; ok: boolean; detail: string };

/**
 * Query wrapper — expõe o resultado da RPC `validate_fiscal_ready`
 * e um flag agregado `allOk` para gating de toggles.
 */
export function useFiscalChecklist(orgId: string) {
  return useQuery({
    queryKey: ["fiscal_checklist", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("validate_fiscal_ready", { _org_id: orgId });
      if (error) throw error;
      const items = (data || []) as ChecklistItem[];
      const pending = items.filter((i) => !i.ok);
      return { items, pending, allOk: pending.length === 0 };
    },
    enabled: !!orgId,
    staleTime: 5_000,
  });
}

export default function FiscalChecklist({ orgId }: { orgId: string }) {
  const { data, isLoading } = useFiscalChecklist(orgId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return null;

  const done = data.items.filter((i) => i.ok).length;
  const total = data.items.length;
  const allOk = data.allOk;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Checklist de Emissão
          <Badge
            variant="outline"
            className={
              allOk
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 ml-auto"
                : "bg-amber-500/15 text-amber-600 border-amber-500/30 ml-auto"
            }
          >
            {done}/{total} {allOk ? "pronto" : "pendentes"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Todos os itens abaixo precisam estar verdes para liberar a emissão em <b>produção</b>.
          A emissão em <b>homologação</b> (testes) exige apenas CNPJ, Razão Social, Regime, CSC, Certificado A1 e Empresa provisionada.
        </p>
        <ul className="divide-y">
          {data.items.map((it) => (
            <li key={it.item} className="flex items-start gap-3 py-2 text-sm">
              {it.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <div className={it.ok ? "text-foreground" : "text-foreground font-medium"}>
                  {it.detail}
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  {it.item}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
