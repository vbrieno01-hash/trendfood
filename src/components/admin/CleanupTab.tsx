import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trash2, ShieldAlert, PlayCircle, Loader2, Image as ImageIcon, Store, User, AlertTriangle, CheckCircle2, Database } from "lucide-react";

type LogRow = {
  id: string;
  kind: "orphan_image" | "inactive_org_warned" | "inactive_org_deleted" | "orphan_user_deleted" | "internal_postgres_logs";
  target: string;
  bucket: string | null;
  size_bytes: number | null;
  reason: string | null;
  dry_run: boolean;
  metadata: any;
  created_at: string;
};

type Stats = {
  config: { dry_run: boolean; dry_run_until: string; enabled: boolean };
  orphan_images_count: number;
  orphan_images_bytes: number;
  inactive_orgs_warned: number;
  inactive_orgs_logged: number;
};

function fmtBytes(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(1)} MB`;
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const KIND_META: Record<LogRow["kind"], { label: string; icon: React.ReactNode; color: string }> = {
  orphan_image: { label: "Imagem órfã", icon: <ImageIcon className="w-3.5 h-3.5" />, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  inactive_org_warned: { label: "Loja avisada", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  inactive_org_deleted: { label: "Loja apagada", icon: <Store className="w-3.5 h-3.5" />, color: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  orphan_user_deleted: { label: "Usuário apagado", icon: <User className="w-3.5 h-3.5" />, color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  internal_postgres_logs: { label: "Logs internos PG", icon: <Database className="w-3.5 h-3.5" />, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

export default function CleanupTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<"orgs" | "storage" | null>(null);
  const [runningInternal, setRunningInternal] = useState(false);
  const [internalSizes, setInternalSizes] = useState<{ http_size: number; cron_size: number; total_size: number; last_run_at: string | null } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [filter, setFilter] = useState<"all" | LogRow["kind"]>("all");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes, sizesRes] = await Promise.all([
        supabase.rpc("get_cleanup_stats"),
        supabase
          .from("cleanup_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.rpc("get_internal_logs_sizes"),
      ]);
      if (statsRes.error) throw statsRes.error;
      if (logsRes.error) throw logsRes.error;
      setStats(statsRes.data as Stats);
      setLogs((logsRes.data as LogRow[]) ?? []);
      if (!sizesRes.error) setInternalSizes(sizesRes.data as any);
    } catch (e: any) {
      toast.error("Erro ao carregar limpeza", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleToggleDryRun = async (next: boolean) => {
    if (!next) {
      const ok = window.confirm(
        "Desativar o modo simulação? A partir da próxima execução, as imagens órfãs e lojas inativas serão APAGADAS de verdade. Tem certeza?",
      );
      if (!ok) return;
    }
    setToggling(true);
    try {
      const { error } = await supabase.rpc("toggle_cleanup_dry_run", { _dry_run: next });
      if (error) throw error;
      toast.success(next ? "Modo simulação ativado" : "Modo real ativado — limpeza apaga de verdade");
      await fetchAll();
    } catch (e: any) {
      toast.error("Erro ao alterar modo", { description: e.message });
    } finally {
      setToggling(false);
    }
  };

  const handleRunOrgs = async () => {
    setRunning("orgs");
    try {
      const { data, error } = await supabase.rpc("run_cleanup_orgs_manual");
      if (error) throw error;
      toast.success("Limpeza de lojas executada", {
        description: `Avisadas: ${(data as any)?.warned ?? 0} · Apagadas: ${(data as any)?.would_delete_or_deleted ?? 0}`,
      });
      await fetchAll();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setRunning(null);
    }
  };

  const handleRunStorage = async () => {
    setRunning("storage");
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-orphan-storage", {
        body: {},
      });
      // Function requires secret — invoke via fetch directly
      if (error || (data && (data as any).error)) {
        // Fallback: chamar via fetch com secret prompted
        const secret = window.prompt(
          "Cole o UNIVERSAL_WEBHOOK_SECRET para rodar a limpeza de storage manualmente:",
        );
        if (!secret) {
          toast.error("Cancelado");
          setRunning(null);
          return;
        }
        const url = `https://xrzudhylpphnzousilye.supabase.co/functions/v1/cleanup-orphan-storage?secret=${encodeURIComponent(secret)}`;
        const r = await fetch(url, { method: "POST" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Falha");
        toast.success("Limpeza de storage executada", {
          description: `Identificados: ${j.total_identified} · ${fmtBytes(j.total_bytes)}`,
        });
      } else {
        toast.success("Limpeza executada", {
          description: `Identificados: ${(data as any).total_identified} · ${fmtBytes((data as any).total_bytes)}`,
        });
      }
      await fetchAll();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setRunning(null);
    }
  };

  const filteredLogs = filter === "all" ? logs : logs.filter((l) => l.kind === filter);

  const handleRunInternal = async () => {
    setRunningInternal(true);
    try {
      const { data, error } = await supabase.rpc("run_cleanup_internal_logs_manual");
      if (error) throw error;
      const d: any = data ?? {};
      const freed = (d.http_freed_bytes ?? 0) + (d.cron_freed_bytes ?? 0);
      toast.success("Logs internos limpos", {
        description: `Apagados: ${d.http_deleted ?? 0} http · ${d.cron_deleted ?? 0} cron${freed > 0 ? ` · liberados ${fmtBytes(freed)}` : ""}`,
      });
      await fetchAll();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setRunningInternal(false);
    }
  };

  const isDryRun = stats?.config?.dry_run ?? true;
  const dryRunUntil = stats?.config?.dry_run_until ? new Date(stats.config.dry_run_until) : null;
  const daysLeft = dryRunUntil ? Math.max(0, Math.ceil((dryRunUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <section className="space-y-6 animate-admin-fade-in">
      <div className="flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-primary/60" />
        <h2 className="text-sm font-bold text-foreground">Limpeza automática</h2>
      </div>

      {/* Banner do modo */}
      <div
        className={`admin-glass rounded-2xl p-5 border-2 flex items-start gap-4 ${
          isDryRun
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-rose-500/40 bg-rose-500/5"
        }`}
      >
        <div className={`p-3 rounded-xl ${isDryRun ? "bg-amber-500/15 text-amber-600" : "bg-rose-500/15 text-rose-600"}`}>
          {isDryRun ? <ShieldAlert className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {isDryRun ? "Modo simulação ativo" : "Modo REAL — apaga de verdade"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isDryRun
              ? `Nada está sendo apagado. ${daysLeft > 0 ? `Período sugerido para revisão: ${daysLeft} dias restantes.` : "Período sugerido de revisão concluído — você pode ativar o modo real quando quiser."} A rotina apenas registra o que seria apagado em "Histórico" abaixo.`
              : "A rotina está apagando imagens órfãs e lojas inativas conforme as regras definidas. Acompanhe o histórico abaixo."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant={isDryRun ? "default" : "outline"}
              onClick={() => handleToggleDryRun(!isDryRun)}
              disabled={toggling}
              className="text-xs"
            >
              {toggling && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              {isDryRun ? "Desativar simulação (apagar de verdade)" : "Voltar para modo simulação"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Imagens órfãs (30d)" value={loading ? null : String(stats?.orphan_images_count ?? 0)} sub={loading ? undefined : fmtBytes(stats?.orphan_images_bytes ?? 0)} icon={<ImageIcon className="w-4 h-4" />} />
        <StatCard label="Lojas avisadas" value={loading ? null : String(stats?.inactive_orgs_warned ?? 0)} icon={<AlertTriangle className="w-4 h-4" />} />
        <StatCard label="Eventos lojas (30d)" value={loading ? null : String(stats?.inactive_orgs_logged ?? 0)} icon={<Store className="w-4 h-4" />} />
        <StatCard label="Modo" value={loading ? null : (isDryRun ? "Simulação" : "Real")} icon={isDryRun ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} />
      </div>

      {/* Manual run buttons */}
      <div className="admin-glass rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">Executar agora:</p>
        <Button size="sm" variant="outline" onClick={handleRunStorage} disabled={running !== null}>
          {running === "storage" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
          Limpeza de storage
        </Button>
        <Button size="sm" variant="outline" onClick={handleRunOrgs} disabled={running !== null}>
          {running === "orgs" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
          Limpeza de lojas inativas
        </Button>
      </div>

      {/* Filtros + tabela */}
      <div className="admin-glass rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mr-1">Tipo:</span>
          {(["all", "orphan_image", "inactive_org_warned", "inactive_org_deleted", "orphan_user_deleted"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                filter === k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {k === "all" ? "Todos" : KIND_META[k as LogRow["kind"]].label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filteredLogs.length} eventos</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhum evento de limpeza ainda. A primeira execução automática roda no próximo agendamento.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredLogs.map((log) => {
              const meta = KIND_META[log.kind];
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-xs">
                  <Badge variant="secondary" className={`${meta.color} gap-1 shrink-0`}>
                    {meta.icon}
                    {meta.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] text-foreground truncate">
                      {log.bucket ? `${log.bucket}/` : ""}{log.target}
                      {log.metadata?.org_name && <span className="text-muted-foreground ml-1">— {log.metadata.org_name}</span>}
                      {log.metadata?.email && <span className="text-muted-foreground ml-1">— {log.metadata.email}</span>}
                    </p>
                    {log.reason && <p className="text-muted-foreground mt-0.5">{log.reason}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {log.size_bytes != null && (
                      <span className="text-muted-foreground font-medium">{fmtBytes(log.size_bytes)}</span>
                    )}
                    {log.dry_run ? (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                        simulado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-600">
                        real
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({
  label, value, sub, icon,
}: { label: string; value: string | null; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="admin-glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      {value === null ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p className="text-2xl font-bold text-foreground">{value}</p>
      )}
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}