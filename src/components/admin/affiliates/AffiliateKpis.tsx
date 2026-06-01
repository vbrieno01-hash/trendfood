import { Users, Target, Wallet, CheckCircle2 } from "lucide-react";
import { Affiliate, Goal, Commission } from "./useAffiliateData";
import { fmtBRL, nextPayoutDate } from "./csvUtils";

export default function AffiliateKpis({
  affiliates, goals, commissions,
}: { affiliates: Affiliate[]; goals: Goal[]; commissions: Commission[] }) {
  const activeAff = affiliates.filter((a) => a.active).length;
  const activeGoals = goals.filter((g) => g.status === "active" || g.status === "awaiting_choice").length;
  const cutoff = nextPayoutDate();
  const toPay = commissions
    .filter((c) => !c.paid_in_batch_id && c.status !== "cancelled" && new Date(c.release_at) <= cutoff)
    .reduce((s, c) => s + c.commission_cents, 0);
  const paid = commissions
    .filter((c) => c.status === "paid" || c.paid_in_batch_id)
    .reduce((s, c) => s + c.commission_cents, 0);

  const kpis = [
    { icon: <Users className="w-5 h-5" />, value: activeAff, label: "Afiliados ativos", iconBg: "bg-blue-500/15", iconColor: "text-blue-600 dark:text-blue-400", gradient: "from-blue-500/20 to-blue-500/5" },
    { icon: <Target className="w-5 h-5" />, value: activeGoals, label: "Metas ativas", iconBg: "bg-violet-500/15", iconColor: "text-violet-600 dark:text-violet-400", gradient: "from-violet-500/20 to-violet-500/5" },
    { icon: <Wallet className="w-5 h-5" />, value: fmtBRL(toPay), label: `A pagar dia ${cutoff.getUTCDate().toString().padStart(2,"0")}/${(cutoff.getUTCMonth()+1).toString().padStart(2,"0")}`, iconBg: "bg-amber-500/15", iconColor: "text-amber-600 dark:text-amber-400", gradient: "from-amber-500/20 to-amber-500/5" },
    { icon: <CheckCircle2 className="w-5 h-5" />, value: fmtBRL(paid), label: "Total já pago", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400", gradient: "from-emerald-500/20 to-emerald-500/5" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k, i) => (
        <div key={i} className="admin-glass rounded-2xl p-4 flex items-center gap-3 relative overflow-hidden">
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${k.gradient} opacity-60 pointer-events-none`} />
          <div className={`relative w-10 h-10 rounded-xl ${k.iconBg} flex items-center justify-center ${k.iconColor}`}>{k.icon}</div>
          <div className="relative min-w-0">
            <p className="text-lg lg:text-xl font-bold text-foreground truncate">{k.value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{k.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}