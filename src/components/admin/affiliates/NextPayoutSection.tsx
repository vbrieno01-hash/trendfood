import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, PlayCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Affiliate, Commission } from "./useAffiliateData";
import { buildPixCsv, downloadCsv, fmtBRL, nextPayoutDate, periodLabel, PayoutRow } from "./csvUtils";

export default function NextPayoutSection({
  affiliates, commissions,
}: { affiliates: Affiliate[]; commissions: Commission[] }) {
  const cutoff = useMemo(() => nextPayoutDate(), []);
  const period = periodLabel(cutoff);
  const [running, setRunning] = useState(false);
  const qc = useQueryClient();

  const affMap = useMemo(() => {
    const m: Record<string, Affiliate> = {};
    affiliates.forEach((a) => (m[a.id] = a));
    return m;
  }, [affiliates]);

  const rows: PayoutRow[] = useMemo(() => {
    const grouped: Record<string, { count: number; total: number }> = {};
    for (const c of commissions) {
      if (c.paid_in_batch_id || c.status === "cancelled") continue;
      if (new Date(c.release_at) > cutoff) continue;
      const g = (grouped[c.affiliate_id] ||= { count: 0, total: 0 });
      g.count += 1;
      g.total += c.commission_cents;
    }
    return Object.entries(grouped)
      .map(([aff_id, v]) => {
        const a = affMap[aff_id];
        return {
          affiliate_id: aff_id,
          affiliate_name: a?.name || aff_id.slice(0, 8),
          pix_key: a?.pix_key || null,
          installments: v.count,
          total_cents: v.total,
        };
      })
      .sort((a, b) => b.total_cents - a.total_cents);
  }, [commissions, cutoff, affMap]);

  const total = rows.reduce((s, r) => s + r.total_cents, 0);

  function handleCsv() {
    if (!rows.length) { toast.error("Nada a pagar"); return; }
    const csv = buildPixCsv(rows, period);
    downloadCsv(`pix-afiliados-${period.replace("/", "-")}.csv`, csv);
    toast.success("CSV gerado");
  }

  async function handleRun() {
    if (!rows.length) { toast.error("Nada a pagar"); return; }
    if (!confirm(`Executar pagamento de ${fmtBRL(total)} para ${rows.length} afiliado(s)? Isso vai marcar as parcelas como pagas e notificar via Telegram.`)) return;
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("affiliate-monthly-payout", { body: { manual: true } });
      if (error) throw error;
      toast.success("Pagamento executado");
      qc.invalidateQueries({ queryKey: ["aff"] });
    } catch (e: any) {
      toast.error(e.message || "Falha ao executar");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm text-muted-foreground">Próximo pagamento</div>
          <div className="text-2xl font-bold">{cutoff.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total a pagar</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(total)}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border/40 rounded-xl">
          Nada a pagar neste ciclo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Afiliado</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">PIX</th>
                <th className="text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Parcelas</th>
                <th className="text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.affiliate_id} className="border-t border-border/30">
                  <td className="px-3 py-2 font-semibold">{r.affiliate_name}</td>
                  <td className="px-3 py-2">
                    {r.pix_key ? (
                      <code className="text-xs">{r.pix_key}</code>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">sem PIX</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{r.installments}</td>
                  <td className="px-3 py-2 text-right font-bold">{fmtBRL(r.total_cents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/10">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
                <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleCsv} disabled={!rows.length}>
          <Download className="w-4 h-4 mr-1" />Baixar CSV PIX
        </Button>
        <Button size="sm" onClick={handleRun} disabled={!rows.length || running}>
          {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
          Executar pagamento agora
        </Button>
      </div>
    </div>
  );
}