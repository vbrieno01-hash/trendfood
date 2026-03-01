import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { RefreshCw, Trash2, AlertCircle, Globe, Bug, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  error_boundary: { label: "Crash", icon: <AlertCircle className="w-3 h-3" />, className: "bg-destructive/15 text-destructive" },
  unhandled_rejection: { label: "Promise", icon: <Zap className="w-3 h-3" />, className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  global_error: { label: "Global", icon: <Globe className="w-3 h-3" />, className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  unknown: { label: "Outro", icon: <Bug className="w-3 h-3" />, className: "bg-muted text-muted-foreground" },
};

function shortUA(ua: string | null) {
  if (!ua) return "—";
  if (ua.includes("Samsung")) return "Samsung";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return ua.slice(0, 20);
}

export default function ErrorLogsTab() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("client_error_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (sourceFilter !== "all") {
      query = query.eq("source", sourceFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar logs");
      console.error(error);
    }
    setLogs((data as unknown as ErrorLog[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [sourceFilter]);

  const handleClearAll = async () => {
    if (!confirm("Apagar todos os logs de erro? Essa ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("client_error_logs" as never).delete().neq("id" as never, "00000000-0000-0000-0000-000000000000" as never);
    if (error) { toast.error("Erro ao limpar logs"); return; }
    setLogs([]);
    toast.success("Logs limpos!");
  };

  const sources = ["all", "error_boundary", "unhandled_rejection", "global_error"];

  return (
    <div className="space-y-5 animate-admin-fade-in">
      {/* Premium header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Logs de Erro</h2>
            <p className="text-xs text-muted-foreground">{logs.length} registros</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="rounded-xl gap-1.5 hover:scale-105 transition-transform">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          {logs.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClearAll} className="rounded-xl gap-1.5 hover:scale-105 transition-transform">
              <Trash2 className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Premium source filter pills */}
      <div className="flex gap-1.5 flex-wrap animate-admin-fade-in admin-delay-1">
        {sources.map((s) => {
          const cfg = SOURCE_CONFIG[s] ?? SOURCE_CONFIG.unknown;
          return (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                sourceFilter === s
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:scale-105"
              }`}
            >
              {s === "all" ? "Todos" : cfg.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 animate-admin-fade-in">
          <AlertCircle className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum erro registrado 🎉</p>
          <p className="text-xs text-muted-foreground/70 mt-1">A plataforma está funcionando sem erros</p>
        </div>
      ) : (
        <div className="admin-glass rounded-2xl overflow-hidden animate-admin-fade-in admin-delay-2">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 bg-muted/20">
                <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-wider">Data/Hora</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider">Erro</TableHead>
                <TableHead className="w-[80px] text-[11px] font-bold uppercase tracking-wider">Source</TableHead>
                <TableHead className="w-[100px] hidden md:table-cell text-[11px] font-bold uppercase tracking-wider">Navegador</TableHead>
                <TableHead className="w-[200px] hidden lg:table-cell text-[11px] font-bold uppercase tracking-wider">URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const cfg = SOURCE_CONFIG[log.source] ?? SOURCE_CONFIG.unknown;
                return (
                  <Collapsible key={log.id} asChild>
                    <>
                      <TableRow className="group hover:bg-gradient-to-r hover:from-primary/[0.03] hover:to-transparent transition-all duration-200 border-b border-border/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <CollapsibleTrigger className="text-left w-full">
                            <p className="text-sm font-mono text-destructive truncate max-w-[300px] lg:max-w-[500px] cursor-pointer hover:underline">
                              {log.error_message}
                            </p>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] gap-1 rounded-full border-0 font-bold ${cfg.className}`} variant="secondary">
                            {cfg.icon} {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                          {shortUA(log.user_agent)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">
                          {log.url ?? "—"}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={5} className="px-5 py-4">
                            <div className="admin-glass rounded-xl p-4 space-y-2">
                              {log.error_stack && (
                                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-48 overflow-auto leading-relaxed">
                                  {log.error_stack}
                                </pre>
                              )}
                              {log.user_id && (
                                <p className="text-[11px] text-muted-foreground">
                                  <span className="font-bold uppercase tracking-wider">User:</span> {log.user_id}
                                </p>
                              )}
                              {log.organization_id && (
                                <p className="text-[11px] text-muted-foreground">
                                  <span className="font-bold uppercase tracking-wider">Org:</span> {log.organization_id}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
