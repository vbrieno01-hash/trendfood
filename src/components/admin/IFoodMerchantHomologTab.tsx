import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, PlayCircle, RefreshCw, Pause, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistStep { name: string; ok: boolean; status: number; detail?: any; }

export default function IFoodMerchantHomologTab() {
  const [orgs, setOrgs] = useState<{ id: string; name: string; merchant_id: string | null; status: string | null }[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [hours, setHours] = useState<any>(null);
  const [interruptions, setInterruptions] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<ChecklistStep[] | null>(null);
  const [loadError, setLoadError] = useState<{ code?: string; message?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ifood_credentials")
        .select("organization_id, merchant_name, merchant_id, status")
        .eq("status", "connected")
        .not("merchant_id", "is", null);
      const { data: orgsData } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", (data || []).map((d: any) => d.organization_id));
      const credByOrg = new Map((data || []).map((d: any) => [d.organization_id, d]));
      const merged = (orgsData || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        merchant_id: credByOrg.get(o.id)?.merchant_id ?? null,
        status: credByOrg.get(o.id)?.status ?? null,
      }));
      setOrgs(merged);
      if (merged[0]) setOrgId(merged[0].id);
    })();
  }, []);

  const call = async (action: string, payload?: any, opts: { silent?: boolean } = {}) => {
    if (!orgId) { toast.error("Selecione uma loja"); return null; }
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-merchant-api", {
        body: { action, organization_id: orgId, payload },
      });
      if (error) throw error;
      if (data?.code || data?.error) {
        if (!opts.silent) {
          toast.error(data.message || data.error || "Erro iFood", { description: JSON.stringify(data.details || data) });
        }
        if (opts.silent) {
          setLoadError({ code: data.code, message: data.message || data.error });
        }
        return null;
      }
      return data;
    } catch (e: any) {
      if (!opts.silent) toast.error("Falha", { description: e?.message });
      else setLoadError({ code: "NetworkError", message: e?.message });
      return null;
    } finally {
      setLoading(null);
    }
  };

  const loadAll = async () => {
    setLoadError(null);
    setMerchant(null); setStatus(null); setHours(null); setInterruptions([]);
    const m = await call("get_merchant", undefined, { silent: true }); if (m) setMerchant(m.data);
    const s = await call("get_status", undefined, { silent: true }); if (s) setStatus(s.data);
    const h = await call("get_opening_hours", undefined, { silent: true }); if (h) setHours(h.data);
    const i = await call("list_interruptions", undefined, { silent: true }); if (i) setInterruptions(Array.isArray(i.data) ? i.data : []);
  };

  useEffect(() => {
    const sel = orgs.find((o) => o.id === orgId);
    if (orgId && sel?.merchant_id) loadAll();
    else { setMerchant(null); setStatus(null); setHours(null); setInterruptions([]); setLoadError(null); }
    /* eslint-disable-next-line */
  }, [orgId, orgs]);

  const runChecklist = async () => {
    setChecklist(null);
    const r = await call("run_checklist");
    if (r) {
      setChecklist(r.steps);
      toast.success(`Checklist: ${r.passed}/${r.total} aprovados`);
    }
  };

  const createPause = async () => {
    const r = await call("create_interruption", { minutes: 30 });
    if (r) { toast.success("Pausa criada"); await loadAll(); }
  };

  const removePause = async (id: string) => {
    const r = await call("delete_interruption", { interruption_id: id });
    if (r) { toast.success("Pausa removida"); await loadAll(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Homologação Merchant API</h2>
        <p className="text-sm text-muted-foreground">
          Gerencia loja no iFood: status, horários e pausas. Os 8 endpoints exigidos na homologação.
        </p>
      </div>

      {orgs.length === 0 && (
        <Card className="border-muted">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nenhuma loja com credencial iFood ativa (status <code>connected</code> + <code>merchant_id</code>).
            Conecte uma loja em <strong>Configurações → Integrações → iFood</strong> antes de homologar.
          </CardContent>
        </Card>
      )}

      {loadError && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="p-4 text-xs space-y-1">
            <div className="font-semibold text-yellow-700 dark:text-yellow-400">
              iFood retornou <code>{loadError.code || "Erro"}</code>: {loadError.message}
            </div>
            <div className="text-muted-foreground">
              Verifique se o <code>merchant_id</code> está homologado em produção e se o token tem
              os escopos <code>merchant.read</code> / <code>merchant.write</code>. Em ambiente de
              homologação, esse 403 é esperado até a aprovação do iFood.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs">Selecione uma loja conectada ao iFood</Label>
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">— escolher —</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={!orgId || !!loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recarregar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Checklist automatizado (8 endpoints)</CardTitle>
          <Button size="sm" onClick={runChecklist} disabled={!orgId || !!loading}>
            {loading === "run_checklist" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            Rodar checklist
          </Button>
        </CardHeader>
        <CardContent>
          {!checklist ? (
            <p className="text-xs text-muted-foreground">Clique em "Rodar checklist" pra executar os 8 endpoints obrigatórios em sequência.</p>
          ) : (
            <div className="space-y-1.5">
              {checklist.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/40">
                  {s.ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <code className="flex-1">{s.name}</code>
                  <Badge variant={s.ok ? "default" : "destructive"}>{s.status || "ERR"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Dados da loja (GET /merchants/{"{id}"})</CardTitle></CardHeader>
          <CardContent className="text-xs">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all max-h-60">{merchant ? JSON.stringify(merchant, null, 2) : "—"}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Status (GET /status)</CardTitle></CardHeader>
          <CardContent className="text-xs">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all max-h-60">{status ? JSON.stringify(status, null, 2) : "—"}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Horários (GET /opening-hours)</CardTitle></CardHeader>
          <CardContent className="text-xs">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all max-h-60">{hours ? JSON.stringify(hours, null, 2) : "—"}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Pause className="w-4 h-4" /> Pausas (interruptions)</CardTitle>
            <Button size="sm" variant="outline" onClick={createPause} disabled={!orgId || !!loading}>
              + Pausa 30min
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {interruptions.length === 0 ? <p className="text-muted-foreground">Nenhuma pausa ativa.</p> : interruptions.map((it: any) => (
              <div key={it.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                <div className="flex-1">
                  <div className="font-medium">{it.description || "(sem descrição)"}</div>
                  <div className="text-muted-foreground">
                    {new Date(it.start).toLocaleString("pt-BR")} → {new Date(it.end).toLocaleString("pt-BR")}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removePause(it.id)} disabled={!!loading}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4 text-xs space-y-1">
          <div className="font-semibold">📋 Critérios de aprovação cobertos automaticamente</div>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>Autenticação: token inválido/expirado retorna 401 padronizado</li>
            <li>Tratamento de erros: 400/401/403/409/429/500 mapeados em <code>{`{code, message}`}</code></li>
            <li>Retry com backoff exponencial em erros 5xx</li>
            <li>Sync automático: pausar loja no TrendFood cria interruption no iFood; horários novos disparam PUT /opening-hours</li>
            <li>Polling de status mínimo de 30s respeitado (chamadas manuais sob demanda)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}