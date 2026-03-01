import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollText, ArrowRight, Link2, Copy, Check, Mail, Building2 } from "lucide-react";
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
  const [copied, setCopied] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<"email" | "org">("email");

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

  const emailWebhookUrl = `${WEBHOOK_BASE}?email={email}&days=${days}&plan=${plan}&secret=trendfood123`;

  const orgWebhookUrl = selectedOrg
    ? `${WEBHOOK_BASE}?org_id=${selectedOrg}&days=${days}&plan=${plan}&secret=trendfood123`
    : "";

  function copyLink(url: string, key: string) {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(key);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(null), 2000);
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
    <section className="space-y-6 animate-admin-fade-in">
      {/* ── Webhook Links ── */}
      <div className="admin-glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Link2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Link de Ativação</h2>
            <p className="text-[11px] text-muted-foreground">Gere links para ativar lojas automaticamente</p>
          </div>
        </div>

        <Tabs value={linkMode} onValueChange={(v) => setLinkMode(v as "email" | "org")}>
          <TabsList className="h-9 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="email" className="text-xs gap-1.5 rounded-lg font-bold data-[state=active]:shadow-sm">
              <Mail className="w-3 h-3" /> Universal (por email)
            </TabsTrigger>
            <TabsTrigger value="org" className="text-xs gap-1.5 rounded-lg font-bold data-[state=active]:shadow-sm">
              <Building2 className="w-3 h-3" /> Por loja (org_id)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use <strong>um único link</strong> para todos os clientes. O gateway substitui <code className="bg-muted px-1.5 py-0.5 rounded-md text-[10px] font-bold">{"{email}"}</code> automaticamente pelo email do comprador.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dias</label>
                <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} className="h-9 text-xs bg-muted/40 border-0 focus-visible:ring-1" min={1} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Plano</label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="h-9 text-xs bg-muted/40 border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro" className="text-xs">Pro</SelectItem>
                    <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 admin-glass rounded-xl px-3 py-2.5 text-xs font-mono text-muted-foreground break-all select-all border-l-2 border-primary">
                {emailWebhookUrl}
              </div>
              <button
                onClick={() => copyLink(emailWebhookUrl, "email")}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 hover:scale-105 transition-all shadow-md shadow-primary/20"
              >
                {copied === "email" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === "email" ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Compatível com webhooks externos. Aceita GET (query params) e POST (JSON body com campo <code>email</code>, <code>customer.email</code> ou <code>buyer.email</code>).
            </p>
          </TabsContent>

          <TabsContent value="org" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gere um link específico para uma loja. Use quando precisar ativar uma loja manualmente via URL.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Loja</label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger className="h-9 text-xs bg-muted/40 border-0"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Dias</label>
                <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} className="h-9 text-xs bg-muted/40 border-0 focus-visible:ring-1" min={1} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Plano</label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="h-9 text-xs bg-muted/40 border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro" className="text-xs">Pro</SelectItem>
                    <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {orgWebhookUrl && (
              <div className="flex items-center gap-2">
                <div className="flex-1 admin-glass rounded-xl px-3 py-2.5 text-xs font-mono text-muted-foreground break-all select-all border-l-2 border-violet-500">
                  {orgWebhookUrl}
                </div>
                <button
                  onClick={() => copyLink(orgWebhookUrl, "org")}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 hover:scale-105 transition-all shadow-md shadow-primary/20"
                >
                  {copied === "org" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "org" ? "Copiado" : "Copiar"}
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Log de Ativações ── */}
      <div className="flex items-center gap-3 animate-admin-fade-in admin-delay-1">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <ScrollText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Log de Ativações</h2>
          <p className="text-[11px] text-muted-foreground">{logs.length} registros</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 animate-admin-fade-in">
          <ScrollText className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma ativação registrada ainda.</p>
        </div>
      ) : (
        <div className="admin-glass rounded-2xl overflow-hidden animate-admin-fade-in admin-delay-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Data</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Loja</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Plano</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Fonte</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Admin</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Notas</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/30 last:border-0 hover:bg-gradient-to-r hover:from-primary/[0.03] hover:to-transparent transition-all duration-200">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{log.org_name || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">{log.old_plan || "—"}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <Badge className="text-[10px] capitalize rounded-full border-0 font-bold bg-primary/15 text-primary">{log.new_plan || "—"}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">{log.old_status || "—"}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
                      <span className="text-xs font-medium">{log.new_status || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] px-2 py-0.5 rounded-full border-0 font-bold ${
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
