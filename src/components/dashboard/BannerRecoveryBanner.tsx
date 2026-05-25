import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ChevronRight } from "lucide-react";

// Data do incidente em que a rotina de limpeza apagou os banners por engano.
const INCIDENT_DATE = new Date("2026-05-22T00:00:00Z");

interface Props {
  orgId: string;
  orgBannerUrl: string | null | undefined;
  onNavigate: (tab: string) => void;
}

export default function BannerRecoveryBanner({ orgId, orgBannerUrl, onNavigate }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (orgBannerUrl) {
      setShow(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("created_at")
        .eq("id", orgId)
        .maybeSingle();
      const createdAt = data?.created_at ? new Date(data.created_at) : null;
      setShow(!!createdAt && createdAt < INCIDENT_DATE);
    })();
  }, [orgId, orgBannerUrl]);

  if (!show) return null;

  return (
    <button
      onClick={() => onNavigate("profile")}
      className="w-full dashboard-glass rounded-2xl p-4 flex items-center gap-3 text-left border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group animate-dashboard-fade-in"
    >
      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Banner da loja precisa ser reenviado
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Uma falha técnica nossa removeu o banner em 22/05. Desculpe! Reenvie em poucos segundos.
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}