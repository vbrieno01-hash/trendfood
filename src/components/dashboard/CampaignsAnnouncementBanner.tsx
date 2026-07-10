import { useEffect, useState } from "react";
import { Megaphone, X, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const DISMISS_KEY = "campaigns-announcement-dismissed";

interface Props {
  orgId: string;
  onNavigate?: (tab: string) => void;
  dismissible?: boolean;
}

export default function CampaignsAnnouncementBanner({ orgId, onNavigate, dismissible = true }: Props) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  });

  const { data: credits } = useQuery({
    queryKey: ["campaign-credits-banner", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaign_credits")
        .select("total_credits")
        .eq("organization_id", orgId)
        .maybeSingle();
      return data;
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const alreadyCustomer = (credits?.total_credits ?? 0) > 0;

  if (dismissed || alreadyCustomer) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleCta = () => {
    onNavigate?.("campaigns");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 shadow-lg animate-dashboard-fade-in"
         style={{
           background: "linear-gradient(135deg, #128C7E 0%, #25D366 55%, #1a6f5f 100%)",
         }}>
      {/* decorative blob */}
      <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-black/10 blur-3xl" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-4 p-5 md:p-6">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-emerald-700 text-[10px] font-bold tracking-wider uppercase">
                <Sparkles className="w-3 h-3" /> Novo
              </span>
              <span className="text-white/80 text-xs font-medium">Add-on TrendFood</span>
            </div>
            <h3 className="text-white font-bold text-lg md:text-xl leading-tight">
              Chegou: Campanhas WhatsApp
            </h3>
            <p className="text-white/90 text-sm mt-1 leading-snug">
              Recupere clientes inativos no automático. <strong>250 msgs/mês por R$ 19,90</strong> — anti-ban incluso.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCta}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-700 font-semibold text-sm hover:bg-white/95 hover:scale-[1.02] transition shadow-md whitespace-nowrap"
          >
            Conhecer agora
            <ArrowRight className="w-4 h-4" />
          </button>
          {dismissible && (
            <button
              onClick={handleDismiss}
              aria-label="Fechar aviso"
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}