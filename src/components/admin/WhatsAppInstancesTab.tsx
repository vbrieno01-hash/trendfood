import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Smartphone, Trash2, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

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

export default function WhatsAppInstancesTab() {
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: rows } = await (supabase.from("whatsapp_instances") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!rows) { setInstances([]); setLoading(false); return; }

    const orgIds = Array.from(new Set(rows.map((r: any) => r.organization_id)));
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
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
