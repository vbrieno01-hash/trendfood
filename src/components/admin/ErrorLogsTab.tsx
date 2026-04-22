import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  RefreshCw,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { classifyError, SEVERITY_META, type Classification, type Severity } from "@/lib/errorClassifier";

interface ErrorLog {
  id: string;
  created_at: string;
  error_message: string;
  error_stack: string | null;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  organization_id: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
}

interface GroupedError {
  patternKey: string;
  classification: Classification;
  count: number;
  lastSeen: string;
  firstSeen: string;
  samples: ErrorLog[];
}

const RESOLVED_KEY = "admin_resolved_error_patterns";

function getResolved(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(RESOLVED_KEY) || "{}");
  } catch {
    return {};
  }
}

function setResolved(map: Record<string, string>) {
  localStorage.setItem(RESOLVED_KEY, JSON.stringify(map));
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

export default function ErrorLogsTab() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIgnorable, setShowIgnorable] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvedMap, setResolvedMapState] = useState<Record<string, string>>(getResolved());

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_error_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Erro ao carregar logs");
      console.error(error);
    }
    setLogs((data as unknown as ErrorLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Agrupa por padrão classificado
  const grouped = useMemo<GroupedError[]>(() => {
    const map = new Map<string, GroupedError>();
    for (const log of logs) {
      const cls = classifyError(log.error_message, log.url, log.error_stack);
      const existing = map.get(cls.patternKey);
      if (existing) {
        existing.count++;
        existing.samples.push(log);
        if (log.created_at > existing.lastSeen) existing.lastSeen = log.created_at;
        if (log.created_at < existing.firstSeen) existing.firstSeen = log.created_at;
      } else {
        map.set(cls.patternKey, {
          patternKey: cls.patternKey,
          classification: cls,
          count: 1,
          lastSeen: log.created_at,
          firstSeen: log.created_at,
          samples: [log],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const order: Record<Severity, number> = { critical: 0, warning: 1, ignorable: 2 };
      const sa = order[a.classification.severity];
      const sb = order[b.classification.severity];
      if (sa !== sb) return sa - sb;
      return b.count - a.count;
    });
  }, [logs]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, ignorable: 0, total: 0 };
    for (const g of grouped) {
      c[g.classification.severity] += g.count;
      c.total += g.count;
    }
    return c;
  }, [grouped]);

  const healthPct = useMemo(() => {
    if (counts.total === 0) return 100;
    const bad = counts.critical * 10 + counts.warning;
    const score = Math.max(0, 100 - bad);
    return Math.min(100, score);
  }, [counts]);

  const visible = useMemo(() => {
    return grouped.filter((g) => {
      if (!showIgnorable && g.classification.severity === "ignorable") return false;
      const isResolved = resolvedMap[g.patternKey] && resolvedMap[g.patternKey] >= g.lastSeen;
      if (!showResolved && isResolved) return false;
      return true;
    });
  }, [grouped, showIgnorable, showResolved, resolvedMap]);

  const handleResolve = (patternKey: string, lastSeen: string) => {
    const newMap = { ...resolvedMap, [patternKey]: lastSeen };
    setResolved(newMap);
    setResolvedMapState(newMap);
    toast.success("Marcado como resolvido. Se voltar a aparecer, será destacado.");
  };

  const handleUnresolve = (patternKey: string) => {
    const newMap = { ...resolvedMap };
    delete newMap[patternKey];
    setResolved(newMap);
    setResolvedMapState(newMap);
  };

  const handleClearAll = async () => {
    if (!confirm("Apagar TODOS os logs de erro? Essa ação não pode ser desfeita.")) return;
    const { error } = await supabase
      .from("client_error_logs" as never)
      .delete()
      .neq("id" as never, "00000000-0000-0000-0000-000000000000" as never);
    if (error) {
      toast.error("Erro ao limpar logs");
      return;
    }
    setLogs([]);
    toast.success("Logs limpos!");
  };

  return (
    <div className="space-y-5 animate-admin-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Saúde da Plataforma</h2>
            <p className="text-xs text-muted-foreground">
              {counts.total} ocorrências · {grouped.length} padrões distintos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-xl gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          {logs.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              className="rounded-xl gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-admin-fade-in admin-delay-1">
        <SummaryCard
          emoji={healthPct >= 95 ? "🟢" : healthPct >= 70 ? "🟡" : "🔴"}
          label="Saúde"
          value={`${healthPct}%`}
          subtitle={
            healthPct >= 95
              ? "Tudo certo"
              : healthPct >= 70
                ? "Atenção"
                : "Investigar agora"
          }
          tone={healthPct >= 95 ? "good" : healthPct >= 70 ? "warn" : "bad"}
        />
        <SummaryCard
          emoji="🔴"
          label="Críticos"
          value={counts.critical.toString()}
          subtitle={
            counts.critical === 0
              ? "Nenhum cliente afetado"
              : "Pagamento ou impressão"
          }
          tone={counts.critical === 0 ? "good" : "bad"}
        />
        <SummaryCard
          emoji="🟡"
          label="Atenção"
          value={counts.warning.toString()}
          subtitle={
            counts.warning === 0 ? "Nada a investigar" : "UI travou em algum momento"
          }
          tone={counts.warning === 0 ? "good" : "warn"}
        />
        <SummaryCard
          emoji="⚪"
          label="Ignoráveis"
          value={counts.ignorable.toString()}
          subtitle={counts.ignorable === 0 ? "Sem ruído" : "Ruído conhecido (ok)"}
          tone="neutral"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap animate-admin-fade-in admin-delay-2">
        <button
          onClick={() => setShowIgnorable((v) => !v)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
            showIgnorable
              ? "bg-muted text-foreground"
              : "bg-primary text-primary-foreground shadow-md"
          }`}
        >
          {showIgnorable ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showIgnorable ? "Mostrando tudo" : "Só o que importa"}
        </button>
        <button
          onClick={() => setShowResolved((v) => !v)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
            showResolved ? "bg-muted text-foreground" : "bg-muted/60 text-muted-foreground"
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          {showResolved ? "Mostrando resolvidos" : "Ocultar resolvidos"}
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 animate-admin-fade-in">
          <Sparkles className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            {counts.total === 0
              ? "Nenhum erro registrado 🎉"
              : "Nada que precise da sua atenção agora 👌"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {counts.total === 0
              ? "A plataforma está saudável"
              : `${counts.ignorable} erros ignoráveis ocultados`}
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-admin-fade-in admin-delay-2">
          {visible.map((g) => {
            const isResolved =
              resolvedMap[g.patternKey] && resolvedMap[g.patternKey] >= g.lastSeen;
            const cameBack =
              resolvedMap[g.patternKey] && resolvedMap[g.patternKey] < g.lastSeen;
            return (
              <ErrorCard
                key={g.patternKey}
                group={g}
                isResolved={!!isResolved}
                cameBack={!!cameBack}
                onResolve={() => handleResolve(g.patternKey, g.lastSeen)}
                onUnresolve={() => handleUnresolve(g.patternKey)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  emoji,
  label,
  value,
  subtitle,
  tone,
}: {
  emoji: string;
  label: string;
  value: string;
  subtitle: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass = {
    good: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    warn: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    bad: "from-destructive/15 to-destructive/5 border-destructive/30",
    neutral: "from-muted/40 to-muted/20 border-border",
  }[tone];

  return (
    <div
      className={`admin-glass rounded-2xl p-4 bg-gradient-to-br ${toneClass} border`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{emoji}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-2xl font-black text-foreground leading-none mb-1">{value}</div>
      <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
    </div>
  );
}

function ErrorCard({
  group,
  isResolved,
  cameBack,
  onResolve,
  onUnresolve,
}: {
  group: GroupedError;
  isResolved: boolean;
  cameBack: boolean;
  onResolve: () => void;
  onUnresolve: () => void;
}) {
  const meta = SEVERITY_META[group.classification.severity];
  const sample = group.samples[0];

  return (
    <Collapsible>
      <div
        className={`admin-glass rounded-2xl border ${meta.className} overflow-hidden transition-all ${
          cameBack ? "ring-2 ring-destructive/50" : ""
        } ${isResolved ? "opacity-60" : ""}`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">{meta.emoji}</span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.className} border`}
              >
                {meta.label}
              </span>
              {cameBack && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                  Voltou!
                </span>
              )}
              {isResolved && !cameBack && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  ✓ Resolvido
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {group.count}× · última {timeAgo(group.lastSeen)}
              </span>
            </div>
            {isResolved ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={onUnresolve}
                className="text-[11px] h-7 px-2 rounded-lg"
              >
                Desmarcar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onResolve}
                className="text-[11px] h-7 px-2 rounded-lg gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Resolvido
              </Button>
            )}
          </div>

          <h3 className="text-base font-bold text-foreground mb-2 leading-snug">
            {group.classification.title}
          </h3>

          <div className="space-y-1.5 text-[13px]">
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">O que é:</span>{" "}
              {group.classification.whatItIs}
            </p>
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">Impacto:</span>{" "}
              {group.classification.impact}
            </p>
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">Ação sugerida:</span>{" "}
              {group.classification.suggestedAction}
            </p>
          </div>

          <CollapsibleTrigger className="mt-3 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-bold uppercase tracking-wider transition-colors">
            <ChevronDown className="w-3 h-3 transition-transform data-[state=open]:rotate-180" />
            Detalhes técnicos
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-2 bg-background/30">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Mensagem original
              </p>
              <pre className="text-[11px] font-mono text-destructive whitespace-pre-wrap break-all">
                {sample.error_message}
              </pre>
            </div>
            {sample.error_stack && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Stack trace
                </p>
                <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-40 overflow-auto leading-relaxed">
                  {sample.error_stack}
                </pre>
              </div>
            )}
            {sample.url && (
              <p className="text-[11px] text-muted-foreground break-all">
                <span className="font-bold uppercase tracking-wider">URL:</span> {sample.url}
              </p>
            )}
            {sample.user_agent && (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold uppercase tracking-wider">Navegador:</span>{" "}
                {sample.user_agent.slice(0, 100)}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/70 pt-1">
              Primeira ocorrência: {new Date(group.firstSeen).toLocaleString("pt-BR")}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}