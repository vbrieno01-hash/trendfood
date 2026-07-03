import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Copy, Trash2, AlertTriangle } from "lucide-react";

interface Row {
  id: string;
  created_at: string;
  source: string | null;
  code: string | null;
  error_message: string | null;
  metadata: any;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `há ${s}s`;
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleString("pt-BR");
}

function formatLine(r: Row) {
  const code = r.code || "WA-UNKNOWN";
  const src = r.source || "desconhecido";
  const msg = (r.error_message || "").replace(/\s+/g, " ").slice(0, 300);
  return `${code} · ${src} · ${msg}`;
}

const WhatsAppErrorLogPanel = ({ orgId }: { orgId: string }) => {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["wa-error-logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_error_logs")
        .select("id, created_at, source, code, error_message, metadata")
        .eq("organization_id", orgId)
        .or("source.ilike.whatsapp%,source.ilike.uazapi%")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 0,
    refetchInterval: 10_000,
  });

  const rows = data ?? [];

  const copyAll = async () => {
    if (!rows.length) return;
    const txt = rows.map(formatLine).join("\n");
    await navigator.clipboard.writeText(txt);
    toast.success("Erros copiados");
  };

  const copyOne = async (r: Row) => {
    await navigator.clipboard.writeText(formatLine(r));
    toast.success("Copiado");
  };

  const clearAll = async () => {
    if (!confirm("Limpar todos os erros do robô desta loja?")) return;
    const { error } = await supabase
      .from("client_error_logs")
      .delete()
      .eq("organization_id", orgId)
      .or("source.ilike.whatsapp%,source.ilike.uazapi%");
    if (error) toast.error(error.message);
    else {
      toast.success("Limpo");
      refetch();
    }
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Diagnóstico do Robô (GBflix)</h3>
            <Badge variant="secondary">{rows.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={copyAll} disabled={!rows.length}>
              <Copy className="h-4 w-4 mr-1" /> Copiar tudo
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAll} disabled={!rows.length}>
              <Trash2 className="h-4 w-4 mr-1" /> Limpar
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum erro registrado nas últimas execuções do robô.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-2 p-2 rounded-md border bg-background text-sm"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="destructive" className="font-mono text-xs">
                      {r.code || "WA-UNKNOWN"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{r.source}</span>
                    <span className="text-xs text-muted-foreground">· {timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-xs break-words">{r.error_message}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => copyOne(r)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppErrorLogPanel;