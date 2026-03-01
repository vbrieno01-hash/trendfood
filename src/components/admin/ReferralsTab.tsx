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
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Indicações</h2>
        <p className="text-sm text-muted-foreground">Acompanhe lojas indicadas por afiliados</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Total de indicações</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{payingReferrals.length}</p>
            <p className="text-xs text-muted-foreground">Viraram assinantes</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {referrals.length > 0 ? Math.round((payingReferrals.length / referrals.length) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de conversão</p>
          </div>
        </div>
      </div>

      {/* Table */}
      {referrals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhuma indicação ainda</p>
          <p className="text-sm">Quando lojas se cadastrarem via link de indicação, aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Loja Indicada</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Indicado por</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plano</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => {
                  const referrerName = r.referred_by_id ? allOrgs.get(r.referred_by_id) ?? "—" : "—";
                  const badge = planBadge[r.subscription_plan] ?? planBadge.free;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{referrerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={badge.className}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={r.subscription_status === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-destructive/15 text-destructive"}>
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
