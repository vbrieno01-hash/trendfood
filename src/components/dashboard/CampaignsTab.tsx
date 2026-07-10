import { useEffect, useState } from "react";
import { Megaphone, Plus, Loader2, Bot, Zap, Check, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCampaignCredits, useCampaigns, useDailySendStats, type Campaign } from "@/hooks/useCampaignCredits";
import { useWhatsappConnected } from "@/hooks/useWhatsappConnected";
import CampaignUpgradeCard from "./campaigns/CampaignUpgradeCard";
import CampaignWizard from "./campaigns/CampaignWizard";
import CampaignTestDialog from "./campaigns/CampaignTestDialog";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";

interface Props {
  orgId: string;
}

export default function CampaignsTab({ orgId }: Props) {
  const { data: credits, isLoading: creditsLoading } = useCampaignCredits(orgId);
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaigns(orgId);
  const { data: botConnected, isLoading: botLoading } = useWhatsappConnected(orgId);
  const { data: dailyStats } = useDailySendStats(orgId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [org, setOrg] = useState<{ name: string; whatsapp: string | null } | null>(null);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("organizations")
      .select("name, whatsapp")
      .eq("id", orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOrg({ name: data.name, whatsapp: data.whatsapp });
      });
  }, [orgId]);

  if (botLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sem robô conectado → orienta e sai
  if (!botConnected) {
    return (
      <div className="dashboard-glass rounded-2xl p-6 border-2 border-amber-500/40 bg-amber-500/5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Robô WhatsApp necessário</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pra disparar campanhas, primeiro conecte o Robô WhatsApp na aba <strong>Robô IA</strong>. Ele é quem entrega as mensagens automaticamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (creditsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const now = new Date();
  const isActive =
    credits?.status === "active" && credits?.period_end && new Date(credits.period_end) > now;

  if (!isActive) {
    return <CampaignUpgradeCard orgId={orgId} />;
  }

  const available = credits!.credits_total - credits!.credits_used;
  const usedPct = (credits!.credits_used / credits!.credits_total) * 100;
  const dailyLimit = dailyStats?.limit ?? 300;
  const dailySent = dailyStats?.sentToday ?? 0;
  const dailyPct = Math.min(100, (dailySent / dailyLimit) * 100);

  return (
    <div className="space-y-5">
      {/* Header + Saldo */}
      <div className="dashboard-glass rounded-2xl p-5 border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Campanhas WhatsApp</h2>
              <p className="text-xs text-muted-foreground">
                Renova em {new Date(credits!.period_end).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setTestOpen(true)}
              disabled={available <= 0}
            >
              <Send className="w-4 h-4 mr-1" />
              Enviar teste
            </Button>
            <Button onClick={() => setWizardOpen(true)} disabled={available <= 0}>
              <Plus className="w-4 h-4 mr-1" />
              Nova campanha
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-foreground">
              {available} de {credits!.credits_total} mensagens restantes
            </span>
            <span className="text-muted-foreground">{credits!.credits_used} usadas</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
              style={{ width: `${Math.min(100, usedPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-4 mb-1.5">
            <span className="font-semibold text-foreground">Enviadas hoje</span>
            <span className="text-muted-foreground">{dailySent} / {dailyLimit} (últimas 24h)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${dailyPct >= 100 ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Aviso anti-ban */}
      <div className="dashboard-glass rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80 leading-relaxed">
          <strong>Proteção anti-ban ativa:</strong> envios espaçados 4–10s automaticamente e limitados a {dailyLimit}/dia para proteger seu número. Contatos sem WhatsApp são descartados na validação e não consomem créditos.
        </p>
      </div>

      {/* Histórico */}
      <div className="dashboard-glass rounded-2xl p-5 border border-border">
        <h3 className="text-sm font-bold text-foreground mb-3">Histórico</h3>
        {campaignsLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Nenhuma campanha ainda. Clique em "Nova campanha" pra começar.
          </div>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <CampaignRow key={c.id} c={c} />
            ))}
          </ul>
        )}
      </div>

      {wizardOpen && credits && (
        <CampaignWizard
          orgId={orgId}
          credits={credits}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
        />
      )}

      {testOpen && (
        <CampaignTestDialog
          orgId={orgId}
          orgName={org?.name ?? "sua loja"}
          orgWhatsapp={org?.whatsapp ?? null}
          creditsAvailable={available}
          open={testOpen}
          onOpenChange={setTestOpen}
        />
      )}
    </div>
  );
}

function CampaignRow({ c }: { c: Campaign }) {
  const statusMeta = {
    draft: { label: "Rascunho", icon: <Clock className="w-3 h-3" />, cls: "bg-muted text-muted-foreground" },
    sending: { label: "Enviando", icon: <Zap className="w-3 h-3" />, cls: "bg-blue-500/20 text-blue-600" },
    completed: { label: "Enviada", icon: <Check className="w-3 h-3" />, cls: "bg-emerald-500/20 text-emerald-600" },
    failed: { label: "Falha", icon: <Clock className="w-3 h-3" />, cls: "bg-red-500/20 text-red-600" },
    canceled: { label: "Cancelada", icon: <Clock className="w-3 h-3" />, cls: "bg-muted text-muted-foreground" },
  }[c.status];

  return (
    <li className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-foreground truncate">{c.name}</div>
        <div className="text-xs text-muted-foreground">
          {c.sent_count}/{c.total_recipients} enviadas ·{" "}
          {new Date(c.created_at).toLocaleDateString("pt-BR")}
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 font-semibold ${statusMeta.cls}`}>
        {statusMeta.icon}
        {statusMeta.label}
      </span>
    </li>
  );
}