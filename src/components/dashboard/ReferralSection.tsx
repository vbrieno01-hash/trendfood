import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Check, Gift, Users, CalendarPlus, BadgeDollarSign, Share2, MessageCircle, UserPlus, CreditCard, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { openWhatsAppWithFallback } from "@/lib/whatsappRedirect";
import { getShareableBaseUrl } from "@/lib/publicUrl";

interface ReferralBonus {
  id: string;
  bonus_days: number;
  referred_org_name: string | null;
  created_at: string;
  released_at: string | null;
  applied_at: string | null;
  reverted_at: string | null;
  flagged_reason: string | null;
}

interface ReferralSectionProps {
  orgId: string;
  subscriptionPlan?: string;
}

export default function ReferralSection({ orgId, subscriptionPlan = "free" }: ReferralSectionProps) {
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [templateKey, setTemplateKey] = useState<"direct" | "friendly" | "pro">("direct");
  const [bonuses, setBonuses] = useState<ReferralBonus[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [priceCents, setPriceCents] = useState(0);

  const referralLink = `${getShareableBaseUrl()}/cadastro?ref=${orgId}`;

  const messageTemplates: Record<"direct" | "friendly" | "pro", { label: string; text: string }> = {
    direct: {
      label: "Direta",
      text: `🔥 Descobri um sistema de cardápio digital pra restaurante SEM TAXA — 0% mesmo, sem pegadinha.\n\nTô usando aqui, tá dando muito certo. Se você se cadastrar pelo meu link, a gente ganha vantagens no plano:\n\n👉 ${referralLink}\n\n(Cardápio, delivery, PDV, cozinha — tudo em um só sistema.)`,
    },
    friendly: {
      label: "Amigável",
      text: `Oi! Lembrei de você 👋\n\nComecei a usar um sistema chamado TrendFood pro meu delivery/cardápio digital. É zero de taxa por pedido (diferente do iFood que come 27%). Tô economizando bastante.\n\nSe topar testar, usa meu link que a gente ganha bônus:\n${referralLink}`,
    },
    pro: {
      label: "Profissional",
      text: `Recomendação: TrendFood — plataforma de cardápio digital, delivery e PDV com taxa 0% por pedido.\n\nDiferenciais:\n• Sem comissão sobre vendas\n• Pedidos direto no WhatsApp\n• PDV, cozinha (KDS) e mesas incluídos\n• Fechamento de caixa profissional\n\nCadastro pelo meu link (bônus pra ambos):\n${referralLink}`,
    },
  };

  const currentMessage = messageTemplates[templateKey].text;

  useEffect(() => {
    (supabase
      .from("organizations")
      .select("id", { count: "exact", head: true }) as any)
      .eq("referred_by_id", orgId)
      .then(({ count: c }: { count: number | null }) => setCount(c ?? 0));

    supabase
      .from("referral_bonuses" as any)
      .select("id, bonus_days, referred_org_name, created_at, released_at, applied_at, reverted_at, flagged_reason")
      .eq("referrer_org_id", orgId)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        if (data) {
          setBonuses(data);
          // Total considera apenas bônus efetivamente aplicados (sem reversão)
          setTotalDays(
            data
              .filter((b: ReferralBonus) => b.applied_at && !b.reverted_at)
              .reduce((sum: number, b: ReferralBonus) => sum + b.bonus_days, 0),
          );
        }
      });

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

  const handleShareWhatsApp = () => {
    openWhatsAppWithFallback(`https://wa.me/?text=${encodeURIComponent(currentMessage)}`);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopiedMsg(true);
      toast.success("Mensagem copiada! Cole onde quiser 📋");
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  const motivationalMessage = (() => {
    if ((count ?? 0) === 0) return "Comece agora! Envie seu link para outros donos de lanchonetes 🚀";
    if (bonuses.length === 0) return "Seus amigos ainda não pagaram um plano. Quando pagarem, você ganha dias grátis! ⏳";
    return "Parabéns! Continue indicando para zerar sua mensalidade! 🎉";
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-dashboard-fade-in">
        <div className="dashboard-section-icon">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Ganhe Desconto</h2>
          <p className="text-sm text-muted-foreground">
            Indique amigos e ganhe dias grátis no seu plano!
          </p>
        </div>
      </div>

      {/* Reward highlight card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground animate-dashboard-fade-in dash-delay-1">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6" />
            <h3 className="text-lg font-bold">Sua Recompensa</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-3xl font-extrabold">+1 mês</p>
              <p className="text-xs opacity-80 mt-0.5">(30 dias grátis)</p>
              <p className="text-sm opacity-90 mt-1">quando seu amigo assinar o <strong>Plano Mensal</strong></p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-3xl font-extrabold">+3 meses</p>
              <p className="text-xs opacity-80 mt-0.5">(90 dias grátis)</p>
              <p className="text-sm opacity-90 mt-1">quando seu amigo assinar o <strong>Plano Anual</strong></p>
            </div>
          </div>
          <p className="text-sm opacity-80 text-center">
            Os meses são adicionados automaticamente ao seu plano atual!
          </p>
        </div>
      </div>

      {/* How it works - 3 steps */}
      <div className="dashboard-glass rounded-2xl p-6 space-y-4 animate-dashboard-fade-in dash-delay-2">
        <h3 className="font-bold text-foreground text-base">Como funciona?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center gap-2 p-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
              <span className="font-semibold text-sm text-foreground">Compartilhe</span>
            </div>
            <p className="text-xs text-muted-foreground">Copie ou envie seu link pelo WhatsApp</p>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="font-semibold text-sm text-foreground">Amigo cadastra</span>
            </div>
            <p className="text-xs text-muted-foreground">Seu amigo cria a loja pelo seu link</p>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <span className="font-semibold text-sm text-foreground">Amigo paga</span>
            </div>
            <p className="text-xs text-muted-foreground">Quando ele assinar um plano, você ganha meses grátis!</p>
          </div>
        </div>
      </div>

      {/* Link + buttons */}
      <div className="dashboard-glass rounded-2xl p-6 space-y-4 animate-dashboard-fade-in dash-delay-3">
        <h3 className="font-bold text-foreground">Seu link de indicação</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-muted-foreground truncate">
            {referralLink}
          </div>
          <Button onClick={handleCopy} size="sm" className="shrink-0 gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">Mensagem pronta</p>
            <div className="inline-flex rounded-lg bg-muted/50 p-1 gap-1">
              {(Object.keys(messageTemplates) as Array<keyof typeof messageTemplates>).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTemplateKey(k)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    templateKey === k
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {messageTemplates[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-muted/40 border border-border rounded-lg p-3 text-sm text-foreground whitespace-pre-line max-h-40 overflow-y-auto">
            {currentMessage}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={handleShareWhatsApp}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageCircle className="w-5 h-5" />
              Enviar no WhatsApp
            </Button>
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="w-full gap-2"
            >
              {copiedMsg ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
              {copiedMsg ? "Mensagem copiada" : "Copiar mensagem"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-dashboard-fade-in dash-delay-3">
        <div className="dashboard-glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{count ?? "—"}</p>
            <p className="text-xs text-muted-foreground">indicados</p>
          </div>
        </div>
        <div className="dashboard-glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarPlus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalDays}</p>
            <p className="text-xs text-muted-foreground">dias ganhos</p>
          </div>
        </div>
        <div className="dashboard-glass rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <BadgeDollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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

      {/* Motivational message */}
      <div className="dashboard-glass rounded-2xl p-4 text-center animate-dashboard-fade-in dash-delay-3">
        <p className="text-sm font-medium text-primary">{motivationalMessage}</p>
      </div>

      {/* Bonus history */}
      {bonuses.length > 0 && (
        <div className="dashboard-glass rounded-2xl p-6 space-y-4 animate-dashboard-fade-in dash-delay-3">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Bônus recebidos
          </h3>
          <div className="space-y-3">
            {bonuses.map((b) => {
              const reverted = !!b.reverted_at;
              const flagged = !reverted && !b.applied_at && !!b.flagged_reason;
              const pending = !reverted && !flagged && !b.applied_at && b.released_at;
              const applied = !!b.applied_at && !reverted;

              let statusLabel = "";
              let statusClass = "text-primary bg-primary/10";
              if (reverted) {
                statusLabel = "estornado";
                statusClass = "text-destructive bg-destructive/10 line-through";
              } else if (flagged) {
                statusLabel = "em revisão";
                statusClass = "text-amber-600 bg-amber-500/10";
              } else if (pending) {
                const releaseDate = new Date(b.released_at!);
                const daysLeft = Math.max(
                  0,
                  Math.ceil((releaseDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
                );
                statusLabel = daysLeft > 0 ? `libera em ${daysLeft}d` : "liberando…";
                statusClass = "text-muted-foreground bg-muted/40";
              } else if (applied) {
                statusLabel = "creditado";
              }

              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className={`text-sm font-medium ${reverted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      +{b.bonus_days} dias por indicar{" "}
                      <span className="font-bold">{b.referred_org_name || "uma loja"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.created_at), "dd/MM/yyyy")}
                      {statusLabel && <> · {statusLabel}</>}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${statusClass}`}>
                    +{b.bonus_days}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
