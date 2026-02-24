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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-bold">Logs de Erro</h2>
          <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          {logs.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Source filter */}
      <div className="flex gap-1.5 flex-wrap">
        {sources.map((s) => {
          const cfg = SOURCE_CONFIG[s] ?? SOURCE_CONFIG.unknown;
          return (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceFilter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {s === "all" ? "Todos" : cfg.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum erro registrado 🎉</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Data/Hora</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="w-[80px]">Source</TableHead>
                <TableHead className="w-[100px] hidden md:table-cell">Navegador</TableHead>
                <TableHead className="w-[200px] hidden lg:table-cell">URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const cfg = SOURCE_CONFIG[log.source] ?? SOURCE_CONFIG.unknown;
                return (
                  <Collapsible key={log.id} asChild>
                    <>
                      <TableRow className="group">
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
                          <Badge className={`text-[10px] gap-1 ${cfg.className}`} variant="secondary">
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
                          <td colSpan={5} className="bg-muted/30 px-4 py-3">
                            {log.error_stack && (
                              <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-48 overflow-auto">
                                {log.error_stack}
                              </pre>
                            )}
                            {log.user_id && (
                              <p className="text-[11px] text-muted-foreground mt-2">
                                <span className="font-medium">User:</span> {log.user_id}
                              </p>
                            )}
                            {log.organization_id && (
                              <p className="text-[11px] text-muted-foreground">
                                <span className="font-medium">Org:</span> {log.organization_id}
                              </p>
                            )}
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
