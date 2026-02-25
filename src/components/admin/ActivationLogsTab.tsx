import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, ArrowRight, Link2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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

interface OrgOption {
  id: string;
  name: string;
}

const WEBHOOK_BASE = "https://xrzudhylpphnzousilye.supabase.co/functions/v1/universal-activation-webhook";

export default function ActivationLogsTab() {
  const [logs, setLogs] = useState<ActivationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [days, setDays] = useState("30");
  const [plan, setPlan] = useState("pro");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: logsData }, { data: orgsData }] = await Promise.all([
        supabase
          .from("activation_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("organizations")
          .select("id, name")
          .order("name"),
      ]);
      setLogs((logsData as unknown as ActivationLog[]) ?? []);
      setOrgs((orgsData as OrgOption[]) ?? []);
      if (orgsData && orgsData.length > 0) setSelectedOrg(orgsData[0].id);
      setLoading(false);
    }
    load();
  }, []);

  const webhookUrl = selectedOrg
    ? `${WEBHOOK_BASE}?org_id=${selectedOrg}&days=${days}&plan=${plan}&secret=trendfood123`
    : "";

  function copyLink() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

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
    <section className="space-y-6">
      {/* ── Webhook Pronto ── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Link de Ativação Universal</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Cole esse link no webhook do seu gateway (Cakto, Kiwify, Hotmart) para ativar lojas automaticamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Loja</label>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Dias</label>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="h-9 text-xs"
              min={1}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Plano</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pro" className="text-xs">Pro</SelectItem>
                <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {webhookUrl && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground break-all select-all">
              {webhookUrl}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        )}
      </div>

      {/* ── Log de Ativações ── */}
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
