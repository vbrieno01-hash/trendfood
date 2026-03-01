import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Store } from "lucide-react";

interface ReferralOrg {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  referred_by_id: string | null;
}

const planBadge: Record<string, { label: string; className: string }> = {
  free: { label: "Grátis", className: "bg-muted text-muted-foreground" },
  pro: { label: "Pro", className: "bg-primary/15 text-primary" },
  enterprise: { label: "Enterprise", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  lifetime: { label: "Vitalício", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
};

export default function ReferralsTab() {
  const [referrals, setReferrals] = useState<ReferralOrg[]>([]);
  const [allOrgs, setAllOrgs] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, slug, subscription_plan, subscription_status, created_at, referred_by_id")
        .order("created_at", { ascending: false });

      if (data) {
        const orgMap = new Map<string, string>();
        data.forEach((o: any) => orgMap.set(o.id, o.name));
        setAllOrgs(orgMap);
        setReferrals((data as any[]).filter((o) => o.referred_by_id));
      }
      setLoading(false);
    }
    load();
  }, []);

  const payingReferrals = referrals.filter((r) => r.subscription_plan !== "free");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-admin-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Indicações</h2>
          <p className="text-sm text-muted-foreground">Acompanhe lojas indicadas por afiliados</p>
        </div>
      </div>

      {/* KPI Cards with glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Users className="w-5 h-5" />, value: referrals.length, label: "Total de indicações", gradient: "from-blue-500/20 to-blue-500/5", iconBg: "bg-blue-500/15", iconColor: "text-blue-600 dark:text-blue-400" },
          { icon: <TrendingUp className="w-5 h-5" />, value: payingReferrals.length, label: "Viraram assinantes", gradient: "from-emerald-500/20 to-emerald-500/5", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400" },
          { icon: <Store className="w-5 h-5" />, value: `${referrals.length > 0 ? Math.round((payingReferrals.length / referrals.length) * 100) : 0}%`, label: "Taxa de conversão", gradient: "from-amber-500/20 to-amber-500/5", iconBg: "bg-amber-500/15", iconColor: "text-amber-600 dark:text-amber-400" },
        ].map((kpi, i) => (
          <div key={i} className={`admin-glass rounded-2xl p-4 flex items-center gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden animate-admin-fade-in admin-delay-${i + 1}`}>
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${kpi.gradient} opacity-50 pointer-events-none`} />
            <div className={`relative w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor}`}>
              {kpi.icon}
            </div>
            <div className="relative">
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {referrals.length === 0 ? (
        <div className="text-center py-20 animate-admin-fade-in">
          <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-medium text-muted-foreground">Nenhuma indicação ainda</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Quando lojas se cadastrarem via link de indicação, aparecerão aqui.</p>
        </div>
      ) : (
        <div className="admin-glass rounded-2xl overflow-hidden animate-admin-fade-in admin-delay-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Loja Indicada</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Indicado por</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Plano</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => {
                  const referrerName = r.referred_by_id ? allOrgs.get(r.referred_by_id) ?? "—" : "—";
                  const badge = planBadge[r.subscription_plan] ?? planBadge.free;
                  return (
                    <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-gradient-to-r hover:from-primary/[0.03] hover:to-transparent transition-all duration-200">
                      <td className="px-4 py-3 font-semibold text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{referrerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`rounded-full border-0 font-bold text-[10px] ${badge.className}`}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={`rounded-full border-0 font-bold text-[10px] ${r.subscription_status === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                          {r.subscription_status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
