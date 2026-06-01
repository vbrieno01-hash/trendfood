import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Tier } from "./useAffiliateData";

export default function TiersGrid({ tiers }: { tiers: Tier[] }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, { upfront_pct: number; installment_pct: number }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const d: typeof draft = {};
    tiers.forEach((t) => { d[t.id] = { upfront_pct: t.upfront_pct, installment_pct: t.installment_pct }; });
    setDraft(d);
  }, [tiers]);

  function changed(t: Tier) {
    const d = draft[t.id];
    if (!d) return false;
    return d.upfront_pct !== t.upfront_pct || d.installment_pct !== t.installment_pct;
  }

  async function save(t: Tier) {
    const d = draft[t.id];
    if (!d) return;
    if (d.upfront_pct < 0 || d.upfront_pct > 100 || d.installment_pct < 0 || d.installment_pct > 100) {
      toast.error("Valores entre 0 e 100"); return;
    }
    setSavingId(t.id);
    try {
      const { error } = await supabase
        .from("affiliate_commission_tiers")
        .update({ upfront_pct: d.upfront_pct, installment_pct: d.installment_pct })
        .eq("id", t.id);
      if (error) throw error;
      toast.success(`${t.label} atualizado`);
      qc.invalidateQueries({ queryKey: ["aff", "tiers"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Estas % são aplicadas quando o cliente paga. Mudanças <b>não afetam</b> metas já criadas.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr>
              <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Plano</th>
              <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">À Vista (%)</th>
              <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">3x cada (%)</th>
              <th className="text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => {
              const d = draft[t.id] || { upfront_pct: t.upfront_pct, installment_pct: t.installment_pct };
              const isDirty = changed(t);
              return (
                <tr key={t.id} className={`border-t border-border/30 ${isDirty ? "bg-amber-500/5" : ""}`}>
                  <td className="px-3 py-2 font-semibold">{t.label}</td>
                  <td className="px-3 py-2 w-32">
                    <Input type="number" step="0.1" min={0} max={100}
                      value={d.upfront_pct}
                      onChange={(e) => setDraft((s) => ({ ...s, [t.id]: { ...d, upfront_pct: Number(e.target.value) } }))}
                      className="h-8" />
                  </td>
                  <td className="px-3 py-2 w-32">
                    <Input type="number" step="0.1" min={0} max={100}
                      value={d.installment_pct}
                      onChange={(e) => setDraft((s) => ({ ...s, [t.id]: { ...d, installment_pct: Number(e.target.value) } }))}
                      className="h-8" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant={isDirty ? "default" : "outline"} disabled={!isDirty || savingId === t.id}
                      onClick={() => save(t)}>
                      {savingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      <span className="ml-1">Salvar</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}