import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Smartphone, Trash2, RefreshCw, CheckCircle2, AlertCircle, Loader2, Play, Activity } from "lucide-react";

interface InstanceRow {
  id: string;
  organization_id: string;
  instance_name: string;
  instance_token: string;
  status: string;
  phone_connected: string | null;
  webhook_configured: boolean;
  created_at: string;
  connected_at: string | null;
  org_name?: string;
  org_slug?: string;
}

interface CleanupHealth {
  last_success_at: string | null;
  last_run_count: number | null;
  details: {
    processed?: number;
    deleted?: number;
    remoteOrphansDeleted?: number;
    errors?: number;
    errorSamples?: string[];
    error?: string;
  } | null;
}

export default function WhatsAppInstancesTab() {
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [health, setHealth] = useState<CleanupHealth | null>(null);
  const [runningCleanup, setRunningCleanup] = useState(false);

  async function load() {
    setLoading(true);
    const { data: rows } = await (supabase.from("whatsapp_instances") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!rows) { setInstances([]); await loadHealth(); setLoading(false); return; }

    const orgIds: string[] = Array.from(new Set(rows.map((r: any) => r.organization_id as string)));
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .in("id", orgIds);

    const orgMap = new Map((orgs || []).map((o) => [o.id, o]));
    const enriched: InstanceRow[] = rows.map((r: any) => ({
      ...r,
      org_name: orgMap.get(r.organization_id)?.name,
      org_slug: orgMap.get(r.organization_id)?.slug,
    }));

    setInstances(enriched);
    await loadHealth();
    setLoading(false);
  }

  async function loadHealth() {
    const { data } = await (supabase.from("cron_health") as any)
      .select("last_success_at, last_run_count, notes")
      .eq("job_name", "whatsapp-cleanup-expired")
      .maybeSingle();
    if (!data) { setHealth(null); return; }
    let details: CleanupHealth["details"] = null;
    try { details = data.notes ? JSON.parse(data.notes) : null; } catch { details = null; }
    setHealth({
      last_success_at: data.last_success_at,
      last_run_count: data.last_run_count,
      details,
    });
  }

  async function runCleanupNow() {
    setRunningCleanup(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-cleanup-expired`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Falha ao rodar limpeza");
      toast.success(
        `Limpeza executada: ${body.deleted ?? 0} apagadas, ${body.remoteOrphansDeleted ?? 0} órfãs, ${body.errors?.length ?? 0} erros`,
      );
      await load();
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    } finally {
      setRunningCleanup(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const counts = {
    total: instances.length,
    connected: instances.filter((i) => i.status === "connected").length,
    connecting: instances.filter((i) => i.status === "connecting").length,
    disconnected: instances.filter((i) => i.status !== "connected" && i.status !== "connecting").length,
  };

  async function refreshStatus(orgId: string) {
    setActingId(orgId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-instance-status?organization_id=${orgId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Status atualizado");
      await load();
    } catch (e) {
      toast.error("Falha ao atualizar: " + (e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function disconnect(orgId: string, deleteFully: boolean) {
    if (!confirm(deleteFully ? "Apagar instância completamente?" : "Desconectar?")) return;
    setActingId(orgId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-disconnect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ organization_id: orgId, delete_instance: deleteFully }),
        },
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success(deleteFully ? "Instância apagada" : "Desconectada");
      await load();
    } catch (e) {
      toast.error("Falha: " + (e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  const statusBadge = (s: string) => {
    if (s === "connected") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Conectado</Badge>;
    if (s === "connecting") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">Conectando</Badge>;
    return <Badge variant="outline">Desconectado</Badge>;
  };

  return (
    <div className="space-y-6 animate-admin-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Instâncias WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Todas as instâncias uazapi criadas pelas lojas via self-service.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" /> Recarregar
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total, color: "text-foreground" },
          { label: "Conectadas", value: counts.connected, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Conectando", value: counts.connecting, color: "text-amber-600 dark:text-amber-400" },
          { label: "Desconectadas", value: counts.disconnected, color: "text-muted-foreground" },
        ].map((m) => (
          <div key={m.label} className="admin-glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
            <div className={`text-2xl font-bold mt-1 ${m.color}`}>
              {loading ? <Skeleton className="h-7 w-12" /> : m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Cleanup automático */}
      <div className="admin-glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-foreground">Limpeza automática (cron a cada 5 min)</div>
              {health?.last_success_at ? (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Última execução: {new Date(health.last_success_at).toLocaleString("pt-BR")}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground mt-1">Nenhuma execução registrada ainda.</div>
              )}
              {health?.details && (
                <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                  <Badge variant="outline">Processadas: {health.details.processed ?? 0}</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    Apagadas: {health.details.deleted ?? 0}
                  </Badge>
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400">
                    Órfãs remotas: {health.details.remoteOrphansDeleted ?? 0}
                  </Badge>
                  <Badge
                    className={
                      (health.details.errors ?? 0) > 0
                        ? "bg-red-500/15 text-red-700 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    Erros: {health.details.errors ?? 0}
                  </Badge>
                </div>
              )}
              {health?.details?.errorSamples && health.details.errorSamples.length > 0 && (
                <div className="text-[10px] text-red-600 dark:text-red-400 mt-2 space-y-0.5">
                  {health.details.errorSamples.map((e, i) => (
                    <div key={i} className="truncate">• {e}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={runCleanupNow}
            disabled={runningCleanup}
            className="gap-2 rounded-xl"
          >
            {runningCleanup ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Rodar agora
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : instances.length === 0 ? (
        <div className="admin-glass rounded-2xl p-10 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma instância criada ainda. Lojistas podem conectar pelo dashboard quando o recurso for liberado.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {instances.map((inst) => (
            <div key={inst.id} className="admin-glass rounded-2xl p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-sm truncate">
                      {inst.org_name || "—"}
                    </span>
                    {statusBadge(inst.status)}
                    {inst.webhook_configured && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Webhook
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 space-x-3">
                    <span>/{inst.org_slug}</span>
                    <span>Instância: <code className="bg-muted/40 px-1 rounded">{inst.instance_name}</code></span>
                    {inst.phone_connected && <span>📱 +{inst.phone_connected}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">
                    Criada {new Date(inst.created_at).toLocaleString("pt-BR")}
                    {inst.connected_at && ` · Conectada ${new Date(inst.connected_at).toLocaleString("pt-BR")}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => refreshStatus(inst.organization_id)}
                    disabled={actingId === inst.organization_id}
                    className="gap-1 rounded-xl"
                  >
                    {actingId === inst.organization_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Atualizar
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => disconnect(inst.organization_id, false)}
                    disabled={actingId === inst.organization_id}
                    className="rounded-xl"
                  >
                    Desconectar
                  </Button>
                  <Button
                    variant="destructive" size="sm"
                    onClick={() => disconnect(inst.organization_id, true)}
                    disabled={actingId === inst.organization_id}
                    className="gap-1 rounded-xl"
                  >
                    <Trash2 className="w-3 h-3" /> Apagar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
