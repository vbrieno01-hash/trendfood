import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Check, Gift, Users, CalendarPlus, Info, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReferralBonus {
  id: string;
  bonus_days: number;
  referred_org_name: string | null;
  created_at: string;
}

interface ReferralSectionProps {
  orgId: string;
  subscriptionPlan?: string;
}

export default function ReferralSection({ orgId, subscriptionPlan = "free" }: ReferralSectionProps) {
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [bonuses, setBonuses] = useState<ReferralBonus[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [priceCents, setPriceCents] = useState(0);

  const BASE_URL = "https://trendfood.lovable.app";
  const referralLink = `${BASE_URL}/cadastro?ref=${orgId}`;

  useEffect(() => {
    // Count referrals
    (supabase
      .from("organizations")
      .select("id", { count: "exact", head: true }) as any)
      .eq("referred_by_id", orgId)
      .then(({ count: c }: { count: number | null }) => setCount(c ?? 0));

    // Fetch bonuses
    supabase
      .from("referral_bonuses" as any)
      .select("id, bonus_days, referred_org_name, created_at")
      .eq("referrer_org_id", orgId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        if (data) {
          setBonuses(data);
          setTotalDays(data.reduce((sum: number, b: ReferralBonus) => sum + b.bonus_days, 0));
        }
      });

    // Fetch plan price
    const planKey = subscriptionPlan === "free" ? "pro" : subscriptionPlan;
    supabase
      .from("platform_plans")
      .select("price_cents")
      .eq("key", planKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPriceCents(data.price_cents);
      });
  }, [orgId, subscriptionPlan]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Ganhe Desconto
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Indique amigos para o TrendFood e ganhe benefícios!
        </p>
      </div>

      {/* Referral card */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Compartilhe seu link</h3>
            <p className="text-sm text-muted-foreground">
              Envie para outros donos de lanchonetes. Quando eles se cadastrarem pelo seu link, você acumula indicações!
            </p>
          </div>
        </div>

        {/* Link box */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-muted-foreground truncate">
            {referralLink}
          </div>
          <Button onClick={handleCopy} size="sm" className="shrink-0 gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{count ?? "—"}</p>
              <p className="text-xs text-muted-foreground">amigos indicados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalDays}</p>
              <p className="text-xs text-muted-foreground">dias ganhos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <BadgeDollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {priceCents > 0
                  ? `R$ ${((totalDays * (priceCents / 30)) / 100).toFixed(2).replace(".", ",")}`
                  : "R$ 0,00"}
              </p>
              <p className="text-xs text-muted-foreground">economia total</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-center font-medium text-primary">
          Continue indicando para zerar sua mensalidade! 🚀
        </p>
      </div>

      {/* How it works */}
      <div className="flex gap-3 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Como funciona?</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Seus dias de bônus são creditados automaticamente quando o amigo indicado <strong className="text-foreground">comprar um plano pago</strong>. O simples cadastro já conta como indicação, mas o bônus só é liberado após o primeiro pagamento.
          </p>
        </div>
      </div>

      {/* Bonus history */}
      {bonuses.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Bônus recebidos
          </h3>
          <div className="space-y-3">
            {bonuses.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    +{b.bonus_days} dias por indicar{" "}
                    <span className="font-bold">{b.referred_org_name || "uma loja"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(b.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                  +{b.bonus_days}d
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
