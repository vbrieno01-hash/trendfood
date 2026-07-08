import { Bot, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { OrgAddon } from "@/hooks/useOrgAddon";

interface AiBotAddonCardProps {
  addon: OrgAddon | null | undefined;
  loading?: boolean;
}

/**
 * Read-only status card for the WhatsApp Bot monthly add-on.
 * Rendered only for orgs with `requires_ai_bot_addon = true`.
 * Payment flow is handled off-app for now — this card only informs status.
 */
export default function AiBotAddonCard({ addon, loading }: AiBotAddonCardProps) {
  if (loading) {
    return (
      <div className="dashboard-glass rounded-2xl p-4 border-2 border-border/60 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-2" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
    );
  }

  const now = new Date();
  const periodEnd = addon?.current_period_end ? new Date(addon.current_period_end) : null;
  const isActive =
    addon?.status === "active" && !!periodEnd && periodEnd > now;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (isActive && periodEnd) {
    return (
      <div className="dashboard-glass rounded-2xl p-4 border-2 border-emerald-500/40 bg-emerald-500/10 flex items-start gap-3 animate-dashboard-fade-in">
        <div className="p-2 rounded-xl flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">Robô WhatsApp ativo</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Próxima cobrança em {formatDate(periodEnd)} · R${" "}
            {Number(addon.price_monthly).toFixed(2).replace(".", ",")}/mês
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-glass rounded-2xl p-4 border-2 border-amber-500/40 bg-amber-500/10 flex items-start gap-3 animate-dashboard-fade-in">
      <div className="p-2 rounded-xl flex-shrink-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">Robô WhatsApp aguardando pagamento</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          A mensalidade do robô (R$ {Number(addon?.price_monthly ?? 50).toFixed(2).replace(".", ",")}) está em aberto.
          Entre em contato com o suporte para regularizar.
        </p>
      </div>
    </div>
  );
}