import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Download } from "lucide-react";
import { Affiliate, Batch, Commission } from "./useAffiliateData";
import { buildPixCsv, downloadCsv, fmtBRL, fmtDateTime, PayoutRow } from "./csvUtils";

export default function BatchesHistory({
  batches, commissions, affiliates,
}: { batches: Batch[]; commissions: Commission[]; affiliates: Affiliate[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const affMap: Record<string, Affiliate> = {};
  affiliates.forEach((a) => (affMap[a.id] = a));

  function batchRows(batchId: string): PayoutRow[] {
    const grouped: Record<string, { count: number; total: number }> = {};
    for (const c of commissions) {
      if (c.paid_in_batch_id !== batchId) continue;
      const g = (grouped[c.affiliate_id] ||= { count: 0, total: 0 });
      g.count++;
      g.total += c.commission_cents;
    }
    return Object.entries(grouped).map(([id, v]) => {
      const a = affMap[id];
      return {
        affiliate_id: id,
        affiliate_name: a?.name || id.slice(0, 8),
        pix_key: a?.pix_key || null,
        installments: v.count,
        total_cents: v.total,
      };
    }).sort((a, b) => b.total_cents - a.total_cents);
  }

  function handleCsv(b: Batch) {
    if (b.csv_data) {
      downloadCsv(`pix-afiliados-${b.period_month}.csv`, b.csv_data);
      return;
    }
    const rows = batchRows(b.id);
    const csv = buildPixCsv(rows, b.period_month);
    downloadCsv(`pix-afiliados-${b.period_month}.csv`, csv);
  }

  if (!batches.length) {
    return <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border/40 rounded-xl">Nenhum batch ainda. O primeiro será gerado no dia 5.</div>;
  }

  return (
    <div className="space-y-2">
      {batches.map((b) => {
        const open = openId === b.id;
        const rows = open ? batchRows(b.id) : [];
        return (
          <div key={b.id} className="rounded-xl border border-border/40 overflow-hidden">
            <button onClick={() => setOpenId(open ? null : b.id)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/20 transition">
              <ChevronRight className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} />
              <div className="text-left flex-1 min-w-0">
                <div className="font-semibold text-sm">{b.period_month}</div>
                <div className="text-[11px] text-muted-foreground">
                  {b.paid_at ? `Pago em ${fmtDateTime(b.paid_at)}` : "Pendente"} · {b.affiliate_count} afiliado(s) · {b.commission_count} parcela(s)
                </div>
              </div>
              <Badge variant="outline" className="font-bold">{fmtBRL(b.total_cents)}</Badge>
              <Badge variant="secondary" className="text-[10px]">{b.status}</Badge>
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCsv(b); }}>
                <Download className="w-3 h-3 mr-1" />CSV
              </Button>
            </button>
            {open && (
              <div className="border-t border-border/40 bg-muted/5 p-3">
                {rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem detalhes.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left p-1">Afiliado</th>
                        <th className="text-left p-1">PIX</th>
                        <th className="text-right p-1">Parcelas</th>
                        <th className="text-right p-1">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.affiliate_id} className="border-t border-border/30">
                          <td className="p-1 font-semibold">{r.affiliate_name}</td>
                          <td className="p-1"><code>{r.pix_key || "—"}</code></td>
                          <td className="p-1 text-right">{r.installments}</td>
                          <td className="p-1 text-right font-bold">{fmtBRL(r.total_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}