import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Eye, AlertTriangle, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Affiliate, Goal, Commission } from "./useAffiliateData";
import { fmtBRL, fmtDate, fmtDateTime } from "./csvUtils";

type Filter = "all" | "awaiting_choice" | "upfront" | "installments_3x" | "completed" | "refunded";

const STATUS_BADGE: Record<string, string> = {
  awaiting_choice: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  active: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  refunded: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_choice: "Aguardando",
  active: "Ativa",
  completed: "Concluída",
  refunded: "Reembolsada",
};

const PLAN_LABEL: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
  lifetime: "Vitalício",
  addon_monthly: "Add-on mensal",
  addon_one_time: "Add-on único",
};

export default function GoalsTable({
  goals, affiliates, commissions, orgsMap, hideAffiliateColumn,
}: {
  goals: Goal[];
  affiliates: Affiliate[];
  commissions: Commission[];
  orgsMap: Record<string, { name: string; slug: string }>;
  hideAffiliateColumn?: boolean;
}) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const affMap = useMemo(() => {
    const m: Record<string, Affiliate> = {};
    affiliates.forEach((a) => (m[a.id] = a));
    return m;
  }, [affiliates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return goals.filter((g) => {
      if (filter === "all") {} 
      else if (filter === "awaiting_choice") { if (g.status !== "awaiting_choice") return false; }
      else if (filter === "completed") { if (g.status !== "completed") return false; }
      else if (filter === "refunded") { if (g.status !== "refunded") return false; }
      else if (filter === "upfront") { if (!(g.status === "active" && g.mode === "upfront")) return false; }
      else if (filter === "installments_3x") { if (!(g.status === "active" && g.mode === "installments_3x")) return false; }
      if (q) {
        const aff = affMap[g.affiliate_id]?.name?.toLowerCase() || "";
        const org = orgsMap[g.client_org_id]?.name?.toLowerCase() || "";
        if (!aff.includes(q) && !org.includes(q)) return false;
      }
      return true;
    });
  }, [goals, filter, search, affMap, orgsMap]);

  async function forceUpfront(g: Goal) {
    if (!confirm(`Forçar À Vista nesta meta? O afiliado receberá 1 parcela única em 7d após o pagamento do cliente.`)) return;
    try {
      const releaseAt = new Date(new Date(g.client_paid_at).getTime() + 7 * 86400000).toISOString();
      const totalCents = Math.round((g.client_amount_cents * g.tier_upfront_pct) / 100);
      const { error: gErr } = await supabase.from("affiliate_client_goals").update({
        mode: "upfront",
        status: "active",
        installments_total: 1,
        installments_paid: 0,
        total_commission_cents: totalCents,
        next_release_at: releaseAt,
      }).eq("id", g.id);
      if (gErr) throw gErr;
      await supabase.from("affiliate_commissions").delete().eq("goal_id", g.id).is("paid_in_batch_id", null);
      const { error: cErr } = await supabase.from("affiliate_commissions").insert({
        affiliate_id: g.affiliate_id,
        organization_id: g.client_org_id,
        goal_id: g.id,
        amount_paid_cents: g.client_amount_cents,
        commission_cents: totalCents,
        commission_pct: g.tier_upfront_pct,
        installment_index: 1,
        status: "released",
        release_at: releaseAt,
      });
      if (cErr) throw cErr;
      toast.success("Forçado para À Vista");
      qc.invalidateQueries({ queryKey: ["aff"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function markRefunded(g: Goal) {
    if (!confirm("Marcar como reembolsado? Parcelas não pagas serão canceladas.")) return;
    try {
      const { error } = await supabase.from("affiliate_client_goals").update({
        status: "refunded",
      }).eq("id", g.id);
      if (error) throw error;
      await supabase.from("affiliate_commissions").update({ status: "cancelled" })
        .eq("goal_id", g.id).is("paid_in_batch_id", null);
      toast.success("Reembolsado");
      qc.invalidateQueries({ queryKey: ["aff"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "awaiting_choice", label: "Aguardando" },
    { id: "upfront", label: "Ativas À Vista" },
    { id: "installments_3x", label: "Ativas 3x" },
    { id: "completed", label: "Concluídas" },
    { id: "refunded", label: "Reembolsadas" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        {chips.map((c) => (
          <button key={c.id} onClick={() => setFilter(c.id)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              filter === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/50 text-muted-foreground hover:bg-muted/30"
            }`}>
            {c.label}
          </button>
        ))}
        <Input
          placeholder="Buscar afiliado ou loja..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-xs ml-auto"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border/40 rounded-xl">
          Nenhuma meta com este filtro.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Loja</th>
                {!hideAffiliateColumn && <th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Afiliado</th>}
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Plano</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Modo</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Progresso</th>
                <th className="text-right px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Comissão</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Próxima</th>
                <th className="text-left px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Status</th>
                <th className="text-right px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const aff = affMap[g.affiliate_id];
                const org = orgsMap[g.client_org_id];
                const goalCommissions = commissions.filter((c) => c.goal_id === g.id);
                const modeBadge = g.mode === "pending_choice"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : g.mode === "upfront"
                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                  : "bg-violet-500/15 text-violet-700 dark:text-violet-400";
                const modeLabel = g.mode === "pending_choice" ? "Aguardando" : g.mode === "upfront" ? "À Vista" : "3x";
                return (
                  <tr key={g.id} className="border-t border-border/30">
                    <td className="px-3 py-2 font-semibold">
                      {org?.name || g.client_org_id.slice(0, 8)}
                      {org?.slug && <div className="text-[10px] text-muted-foreground">/{org.slug}</div>}
                    </td>
                    {!hideAffiliateColumn && <td className="px-3 py-2">{aff?.name || "—"}</td>}
                    <td className="px-3 py-2 text-xs">{PLAN_LABEL[g.plan_key] || g.plan_key}<div className="text-[10px] text-muted-foreground">{fmtBRL(g.client_amount_cents)}</div></td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border-0 ${modeBadge}`}>{modeLabel}</span></td>
                    <td className="px-3 py-2 text-xs">{g.installments_paid}/{g.installments_total}</td>
                    <td className="px-3 py-2 text-right font-bold">{fmtBRL(g.total_commission_cents)}</td>
                    <td className="px-3 py-2 text-xs">{fmtDate(g.next_release_at)}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[g.status]}`}>{STATUS_LABEL[g.status]}</span></td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ver parcelas"><Eye className="w-3 h-3" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="end">
                            <div className="text-xs font-bold mb-2">Parcelas</div>
                            {goalCommissions.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhuma parcela ainda.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {goalCommissions.sort((a,b) => a.installment_index - b.installment_index).map((c) => (
                                  <li key={c.id} className="text-xs flex justify-between items-center gap-2 border-b border-border/30 pb-1.5">
                                    <div>
                                      <div className="font-semibold">#{c.installment_index} · {fmtBRL(c.commission_cents)}</div>
                                      <div className="text-[10px] text-muted-foreground">Libera: {fmtDate(c.release_at)}</div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">
                                      {c.paid_in_batch_id ? "Pago" : c.status === "cancelled" ? "Cancelada" : "Pendente"}
                                    </Badge>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </PopoverContent>
                        </Popover>
                        {g.status === "awaiting_choice" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Forçar À Vista" onClick={() => forceUpfront(g)}>
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                          </Button>
                        )}
                        {(g.status === "active" || g.status === "awaiting_choice") && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Marcar reembolsado" onClick={() => markRefunded(g)}>
                            <ShieldX className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground text-right">{filtered.length} meta(s) · criada em {goals[0] ? fmtDateTime((goals[0] as any).created_at) : "—"}</p>
    </div>
  );
}