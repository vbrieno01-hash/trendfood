import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Zap, ShieldCheck, ShieldAlert, RefreshCw, Activity, AlertTriangle, MessageSquare } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type Period = "24h" | "7d" | "30d";

interface DashboardData {
  period: string;
  since: string;
  totals: { total: number; sent: number; errors: number; duplicates: number; avg_latency_ms: number };
  by_provider: { provider: string; count: number; avg_latency_ms: number }[];
  by_status: { status: string; count: number }[];
  top_orgs: { organization_id: string | null; org_name: string; count: number; avg_latency_ms: number }[];
  groq_blocked_until: string | null;
  groq_blocked: boolean;
}

interface RecentMessage {
  id: string;
  created_at: string;
  organization_id: string | null;
  org_name: string;
  provider: string | null;
  status: string;
  latency_ms: number | null;
  phone_hash: string | null;
  reply_preview: string | null;
}

const PROVIDER_COLORS: Record<string, string> = {
  groq: "hsl(var(--primary))",
  cerebras: "hsl(var(--accent))",
  unknown: "hsl(var(--muted-foreground))",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Enviada",
  ai_rate_limit: "Rate limit IA",
  ai_unavailable: "IA indisponível",
  wa_send_failed: "Falha WhatsApp",
  duplicate_reply_suppressed: "Duplicada suprimida",
  exception: "Exceção",
};

function statusVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "sent") return "default";
  if (s === "duplicate_reply_suppressed") return "secondary";
  return "destructive";
}

function fmtDuration(msUntil: number): string {
  if (msUntil <= 0) return "expirado";
  const h = Math.floor(msUntil / 3600000);
  const m = Math.floor((msUntil % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function BotMonitorTab() {
  const [period, setPeriod] = useState<Period>("24h");
  const qc = useQueryClient();

  const dashQ = useQuery({
    queryKey: ["admin_bot_dashboard", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_bot_dashboard" as any, { _period: period });
      if (error) throw error;
      return data as unknown as DashboardData;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const recentQ = useQuery({
    queryKey: ["admin_bot_recent"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_bot_recent_messages" as any, { _limit: 50 });
      if (error) throw error;
      return (data as unknown as RecentMessage[]) ?? [];
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  async function handleUnblockGroq() {
    const { error } = await supabase.rpc("admin_unblock_groq" as any);
    if (error) {
      toast.error("Falha ao desbloquear Groq: " + error.message);
      return;
    }
    toast.success("Groq desbloqueado. Próxima mensagem tentará Groq de novo.");
    qc.invalidateQueries({ queryKey: ["admin_bot_dashboard"] });
  }

  const dash = dashQ.data;
  const groqBlockedUntil = dash?.groq_blocked_until ? new Date(dash.groq_blocked_until) : null;
  const groqRemainingMs = groqBlockedUntil ? groqBlockedUntil.getTime() - Date.now() : 0;
  const groqBlocked = !!dash?.groq_blocked;

  const providerData = (dash?.by_provider ?? []).map((p) => ({
    name: p.provider,
    value: p.count,
    color: PROVIDER_COLORS[p.provider] ?? PROVIDER_COLORS.unknown,
  }));

  const statusData = (dash?.by_status ?? []).map((s) => ({
    name: STATUS_LABEL[s.status] ?? s.status,
    count: s.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Monitor do Robô</h2>
            <p className="text-sm text-muted-foreground">Consumo, providers de IA, saúde das instâncias e últimas conversas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["24h", "7d", "30d"] as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["admin_bot_dashboard"] });
              qc.invalidateQueries({ queryKey: ["admin_bot_recent"] });
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Providers status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">Groq</span>
                {groqBlocked ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Bloqueado
                  </Badge>
                ) : (
                  <Badge className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Livre
                  </Badge>
                )}
              </div>
              {groqBlocked && groqBlockedUntil ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Bloqueado até <strong>{groqBlockedUntil.toLocaleString("pt-BR")}</strong>
                  {" · "}
                  restam <strong>{fmtDuration(groqRemainingMs)}</strong>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Provider primário disponível.</p>
              )}
            </div>
            {groqBlocked && (
              <Button size="sm" variant="outline" onClick={handleUnblockGroq}>
                Desbloquear
              </Button>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-foreground" />
            <span className="font-medium">Cerebras (fallback)</span>
            <Badge>Ativo</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Usado automaticamente quando o Groq falha ou bate no limite diário.
          </p>
        </Card>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini label="Mensagens" value={dash?.totals.total ?? 0} icon={<MessageSquare className="h-4 w-4" />} />
        <KpiMini label="Enviadas" value={dash?.totals.sent ?? 0} tone="success" />
        <KpiMini label="Erros / Rate limit" value={dash?.totals.errors ?? 0} tone="danger" icon={<AlertTriangle className="h-4 w-4" />} />
        <KpiMini label="Latência média" value={`${dash?.totals.avg_latency_ms ?? 0} ms`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-medium mb-3">Split por provider</h3>
          <div className="h-64">
            {providerData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={providerData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {providerData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {(dash?.by_provider ?? []).map((p) => (
              <div key={p.provider} className="flex justify-between text-muted-foreground">
                <span className="capitalize">{p.provider}</span>
                <span>{p.count} msg · {p.avg_latency_ms} ms média</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-medium mb-3">Por status</h3>
          <div className="h-64">
            {statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Top orgs */}
      <Card className="p-5">
        <h3 className="font-medium mb-3">Top 10 lojas por volume ({period})</h3>
        {dash?.top_orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Loja</th>
                  <th className="py-2 text-right">Mensagens</th>
                  <th className="py-2 text-right">Latência média</th>
                </tr>
              </thead>
              <tbody>
                {(dash?.top_orgs ?? []).map((o, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{o.org_name}</td>
                    <td className="py-2 text-right font-medium">{o.count}</td>
                    <td className="py-2 text-right text-muted-foreground">{o.avg_latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent messages */}
      <Card className="p-5">
        <h3 className="font-medium mb-3">Últimas 50 respostas do robô</h3>
        {(recentQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma resposta registrada ainda. As métricas começam a aparecer conforme o robô responder mensagens.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Quando</th>
                  <th className="py-2">Loja</th>
                  <th className="py-2">Telefone</th>
                  <th className="py-2">Provider</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Latência</th>
                  <th className="py-2">Prévia</th>
                </tr>
              </thead>
              <tbody>
                {(recentQ.data ?? []).map((m) => (
                  <tr key={m.id} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 pr-3">{m.org_name}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{m.phone_hash ?? "—"}</td>
                    <td className="py-2 pr-3 capitalize">{m.provider ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={statusVariant(m.status)}>{STATUS_LABEL[m.status] ?? m.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">{m.latency_ms ?? "—"} ms</td>
                    <td className="py-2 max-w-[320px] truncate text-muted-foreground" title={m.reply_preview ?? ""}>
                      {m.reply_preview ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiMini({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "danger"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
    </Card>
  );
}