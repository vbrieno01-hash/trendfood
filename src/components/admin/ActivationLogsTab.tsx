import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, ArrowRight } from "lucide-react";

interface ActivationLog {
  id: string;
  organization_id: string;
  org_name: string | null;
  old_plan: string | null;
  new_plan: string | null;
  old_status: string | null;
  new_status: string | null;
  source: string;
  admin_email: string | null;
  notes: string | null;
  created_at: string;
}

export default function ActivationLogsTab() {
  const [logs, setLogs] = useState<ActivationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("activation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data as unknown as ActivationLog[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Log de Ativações</h2>
        <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Nenhuma ativação registrada ainda.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Loja</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Fonte</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Notas</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{log.org_name || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">{log.old_plan || "—"}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <Badge variant="secondary" className="text-xs capitalize">{log.new_plan || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">{log.old_status || "—"}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <span className="text-xs">{log.new_status || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium ${
                        log.source === "webhook"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          : "bg-violet-500/15 text-violet-700 dark:text-violet-400"
                      }`}>
                        {log.source === "webhook" ? "Webhook" : "Manual"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{log.admin_email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{log.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
