import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, MessageCircle, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getShareableBaseUrl } from "@/lib/publicUrl";
import { openWhatsAppWithFallback } from "@/lib/whatsappRedirect";

interface ReferralHomeCardProps {
  orgId: string;
  onNavigate?: (tab: string) => void;
}

export default function ReferralHomeCard({ orgId, onNavigate }: ReferralHomeCardProps) {
  const [count, setCount] = useState<number>(0);
  const [days, setDays] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const referralLink = `${getShareableBaseUrl()}/cadastro?ref=${orgId}`;
  const waMessage = `🔥 Achei um sistema pra restaurante com 0% de taxa (sem pegadinha!). Tô usando e economizando muito comparado ao iFood.\n\nSe cadastrar pelo meu link, a gente ganha bônus:\n👉 ${referralLink}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ count: c }, { data: bonusData }] = await Promise.all([
        (supabase.from("organizations").select("id", { count: "exact", head: true }) as any).eq("referred_by_id", orgId),
        supabase
          .from("referral_bonuses" as any)
          .select("bonus_days, applied_at, reverted_at")
          .eq("referrer_org_id", orgId),
      ]);
      if (cancelled) return;
      setCount(c ?? 0);
      if (bonusData) {
        const total = (bonusData as any[])
          .filter((b) => b.applied_at && !b.reverted_at)
          .reduce((s, b) => s + (b.bonus_days || 0), 0);
        setDays(total);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copiado! Cole no WhatsApp 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não consegui copiar. Copie manualmente.");
    }
  };

  const handleShare = () => {
    openWhatsAppWithFallback(`https://wa.me/?text=${encodeURIComponent(waMessage)}`);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 md:p-6 animate-dashboard-fade-in">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-amber-400/10 blur-2xl" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5">
        {/* Left: pitch + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
              <Sparkles className="w-3 h-3" /> Ganhe meses grátis
            </span>
          </div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground leading-tight">
            Indique 1 dono de restaurante e ganhe <span className="text-primary">+1 mês grátis</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Ele assina o Plano Anual? Você ganha <strong className="text-foreground">3 meses</strong>. Sem limite de indicações.
          </p>

          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{count}</span>
              </div>
              <span className="text-muted-foreground">indicados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{days}</span>
              </div>
              <span className="text-muted-foreground">dias ganhos</span>
            </div>
          </div>
        </div>

        {/* Right: quick actions */}
        <div className="flex flex-col gap-2 lg:w-[280px] shrink-0">
          <Button onClick={handleShare} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
            <MessageCircle className="w-4 h-4" />
            Enviar meu link no WhatsApp
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado" : "Copiar link"}
            </Button>
            <Button
              onClick={() => onNavigate?.("referral")}
              variant="ghost"
              size="sm"
              className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
            >
              Ver programa
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}