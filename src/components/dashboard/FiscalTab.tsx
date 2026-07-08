import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import UpgradePrompt from "@/components/dashboard/UpgradePrompt";
import { FileText, ShieldCheck, ShieldAlert, Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FiscalHistoryTab from "@/components/dashboard/FiscalHistoryTab";
import { Progress } from "@/components/ui/progress";
import { useFiscalQuota } from "@/hooks/useFiscalQuota";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

async function handleUnauthorized(): Promise<boolean> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data?.session) {
    toast.error("Sua sessão expirou, faça login novamente");
    try { await supabase.auth.signOut(); } catch {}
    window.location.href = "/auth";
    return false;
  }
  return true;
}

type Props = {
  orgId: string;
  organization: { subscription_plan?: string | null } & Record<string, any>;
  effectivePlan: string;
  promoEligible?: boolean;
};

type FiscalConfig = {
  id: string;
  organization_id: string;
  cnpj: string | null;
  ie: string | null;
  im: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  regime_tributario: number | null;
  endereco_json: Record<string, string> | null;
  csc_id: string | null;
  csc_token: string | null;
  environment: string;
  mode: string;
  enabled: boolean;
  producao_liberada: boolean;
  certificado_uploaded_at: string | null;
  certificado_expira_em: string | null;
  default_ncm: string | null;
  cfop_padrao: string | null;
  default_cst_csosn: string | null;
  default_origem: number | null;
  default_unidade: string | null;
  focus_token_mode?: string | null;
};

function onlyDigits(v: string) { return (v || "").replace(/\D/g, ""); }

export default function FiscalTab({ orgId, organization, effectivePlan, promoEligible }: Props) {
  const qc = useQueryClient();

  const { data: cfg, isLoading, refetch } = useQuery({
    queryKey: ["fiscal_config", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("fiscal_config")
        .select("*").eq("organization_id", orgId).maybeSingle();
      if (error) throw error;
      return data as FiscalConfig | null;
    },
    enabled: !!orgId,
    staleTime: 10_000,
  });

  // Enterprise gate
  if (effectivePlan !== "enterprise" && effectivePlan !== "lifetime") {
    return (
      <UpgradePrompt
        title="Emissão de NFC-e"
        description="Emita notas fiscais eletrônicas (NFC-e) automaticamente a cada venda. Disponível no plano Enterprise."
        orgId={orgId}
        currentPlan={organization.subscription_plan ?? "free"}
        promoEligible={!!promoEligible}
      />
    );
  }

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-64"/><Skeleton className="h-32 w-full"/><Skeleton className="h-64 w-full"/></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5" /> Fiscal — NFC-e
        </h2>
        <p className="text-sm text-muted-foreground">Configuração e histórico de notas fiscais eletrônicas (Focus NFe).</p>
      </div>
      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4">
          <FiscalQuotaCard orgId={orgId} />
          <div className="h-4" />
          <FiscalTabContent orgId={orgId} cfg={cfg} onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["fiscal_config", orgId] }); }} />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <FiscalHistoryTab orgId={orgId} regime={cfg?.regime_tributario ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FiscalTabContent({ orgId, cfg, onSaved }: { orgId: string; cfg: FiscalConfig | null; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [certPassword, setCertPassword] = useState("");

  // Form state
  const end = (cfg?.endereco_json || {}) as Record<string, string>;
  const [form, setForm] = useState({
    cnpj: cfg?.cnpj ?? "",
    ie: cfg?.ie ?? "",
    im: cfg?.im ?? "",
    razao_social: cfg?.razao_social ?? "",
    nome_fantasia: cfg?.nome_fantasia ?? "",
    regime_tributario: String(cfg?.regime_tributario ?? 1),
    environment: cfg?.environment ?? "homologacao",
    enabled: !!cfg?.enabled,
    csc_id: cfg?.csc_id ?? "",
    csc_token: cfg?.csc_token ?? "",
    logradouro: end.logradouro ?? "",
    numero: end.numero ?? "",
    bairro: end.bairro ?? "",
    cidade: end.cidade ?? "",
    uf: end.uf ?? "",
    cep: end.cep ?? "",
    email: end.email ?? "",
    telefone: end.telefone ?? "",
  });

  const status = useMemo(() => {
    if (!cfg) return { label: "Não configurado", tone: "destructive" as const, icon: ShieldAlert };
    const missingCompany = !cfg.cnpj || !cfg.razao_social || !cfg.regime_tributario;
    const missingCert = !cfg.certificado_uploaded_at;
    if (missingCompany) return { label: "Dados da empresa incompletos", tone: "destructive" as const, icon: ShieldAlert };
    if (missingCert) return { label: "Certificado A1 pendente", tone: "warning" as const, icon: AlertTriangle };
    if (!cfg.enabled) return { label: "Configurado — emissão desativada", tone: "warning" as const, icon: AlertTriangle };
    return { label: `Ativo (${cfg.environment === "producao" ? "Produção" : "Homologação"})`, tone: "success" as const, icon: ShieldCheck };
  }, [cfg]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.cnpj || !form.razao_social) {
      toast.error("CNPJ e Razão Social são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        cnpj: onlyDigits(form.cnpj),
        ie: form.ie || null,
        im: form.im || null,
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia || null,
        regime_tributario: Number(form.regime_tributario) || 1,
        environment: form.environment,
        enabled: form.enabled,
        csc_id: form.csc_id || null,
        csc_token: form.csc_token || null,
        endereco_json: {
          logradouro: form.logradouro, numero: form.numero, bairro: form.bairro,
          cidade: form.cidade, uf: form.uf.toUpperCase().slice(0, 2), cep: onlyDigits(form.cep),
          email: form.email, telefone: form.telefone,
        },
      };
      const { error } = await supabase.from("fiscal_config")
        .upsert(payload, { onConflict: "organization_id" });
      if (error) throw error;
      toast.success("Dados fiscais salvos");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally { setSaving(false); }
  }

  async function handleUploadCert() {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Selecione o arquivo .pfx"); return; }
    if (!certPassword) { toast.error("Informe a senha do certificado"); return; }
    if (!cfg?.cnpj) { toast.error("Salve o CNPJ antes de enviar o certificado"); return; }
    setUploading(true);
    try {
      const buildFd = () => {
        const fd = new FormData();
        fd.append("organization_id", orgId);
        fd.append("password", certPassword);
        fd.append("file", file);
        return fd;
      };
      let { data, error } = await supabase.functions.invoke("fiscal-upload-certificate", { body: buildFd() });
      if ((data as any)?.code === "unauthorized") {
        if (!(await handleUnauthorized())) return;
        ({ data, error } = await supabase.functions.invoke("fiscal-upload-certificate", { body: buildFd() }));
      }
      if (error) {
        const status = (error as any)?.status ?? (error as any)?.context?.status;
        console.error("[fiscal-upload] gateway/invoke error", {
          name: (error as any)?.name,
          message: (error as any)?.message,
          status,
          context: (error as any)?.context,
          data,
        });
        let hint = (error as any)?.message || "Falha no upload do certificado";
        if (status === 404) hint = "Função não encontrada (deploy desatualizado?)";
        else if (status === 401) hint = "Não autorizado — faça login novamente";
        else if (status === 504) hint = "Gateway timeout ao contatar Focus NFe";
        throw new Error(hint);
      }
      if ((data as any)?.ok === false) {
        console.error("[fiscal-upload] erro de negócio", data);
        throw new Error((data as any)?.message || (data as any)?.code || "Erro no upload");
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Certificado enviado com sucesso");
      setCertPassword("");
      if (fileRef.current) fileRef.current.value = "";
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload do certificado");
    } finally { setUploading(false); }
  }

  async function handleSyncFocus() {
    setSyncing(true);
    try {
      let { data, error } = await supabase.functions.invoke("fiscal-focus-setup", {
        body: { organization_id: orgId },
      });
      if ((data as any)?.code === "unauthorized") {
        if (!(await handleUnauthorized())) return;
        ({ data, error } = await supabase.functions.invoke("fiscal-focus-setup", {
          body: { organization_id: orgId },
        }));
      }
      if (error) {
        const status = (error as any)?.status ?? (error as any)?.context?.status;
        console.error("[fiscal-focus-setup] gateway/invoke error", {
          name: (error as any)?.name,
          message: (error as any)?.message,
          status,
          context: (error as any)?.context,
          data,
        });
        let hint = (error as any)?.message || "Falha ao sincronizar com Focus NFe";
        if (status === 404) hint = "Função não encontrada (deploy desatualizado?)";
        else if (status === 401) hint = "Não autorizado — faça login novamente";
        else if (status === 504) hint = "Gateway timeout ao contatar Focus NFe";
        throw new Error(hint);
      }
      if ((data as any)?.ok === false) {
        console.error("[fiscal-focus-setup] erro de negócio", data);
        const detail = (data as any)?.detail;
        const msg = (data as any)?.message || (data as any)?.code || "Erro ao sincronizar";
        throw new Error(detail && typeof detail === "object" ? `${msg}: ${JSON.stringify(detail)}` : msg);
      }
      if ((data as any)?.error) throw new Error(JSON.stringify((data as any).detail || (data as any).error));
      toast.success("Empresa sincronizada com Focus NFe");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao sincronizar");
    } finally { setSyncing(false); }
  }

  const StatusIcon = status.icon;
  const badgeClass =
    status.tone === "success" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" :
    status.tone === "warning" ? "bg-amber-500/15 text-amber-600 border-amber-500/30" :
    "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={`${badgeClass} gap-1.5 px-3 py-1.5 text-xs`}>
            <StatusIcon className="w-3.5 h-3.5" /> {status.label}
          </Badge>
          {cfg?.certificado_expira_em && (
            <span className="text-xs text-muted-foreground">Certificado expira em <b>{cfg.certificado_expira_em}</b></span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="fiscal-enabled" className="text-xs text-muted-foreground">Emissão automática</Label>
            <Switch id="fiscal-enabled" checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </div>
        </CardContent>
      </Card>

      {/* 1. Dados da empresa */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Dados da empresa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="CNPJ *" value={form.cnpj} onChange={v => set("cnpj", v)} placeholder="00.000.000/0000-00" />
            <Field label="Inscrição Estadual" value={form.ie} onChange={v => set("ie", v)} placeholder="ISENTO se não tiver" />
            <Field label="Razão Social *" value={form.razao_social} onChange={v => set("razao_social", v)} />
            <Field label="Nome Fantasia" value={form.nome_fantasia} onChange={v => set("nome_fantasia", v)} />
            <Field label="Inscrição Municipal" value={form.im} onChange={v => set("im", v)} />
            <div className="space-y-1.5">
              <Label className="text-xs">Regime tributário</Label>
              <Select value={form.regime_tributario} onValueChange={v => set("regime_tributario", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Simples Nacional</SelectItem>
                  <SelectItem value="2">Simples Nacional — excesso de sublimite</SelectItem>
                  <SelectItem value="3">Regime Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <div className="text-xs font-medium text-muted-foreground">Endereço fiscal</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Logradouro" value={form.logradouro} onChange={v => set("logradouro", v)} />
            <Field label="Número" value={form.numero} onChange={v => set("numero", v)} />
            <Field label="Bairro" value={form.bairro} onChange={v => set("bairro", v)} />
            <Field label="Cidade" value={form.cidade} onChange={v => set("cidade", v)} />
            <Field label="UF" value={form.uf} onChange={v => set("uf", v.toUpperCase().slice(0, 2))} />
            <Field label="CEP" value={form.cep} onChange={v => set("cep", v)} />
            <Field label="E-mail (contato fiscal)" value={form.email} onChange={v => set("email", v)} />
            <Field label="Telefone" value={form.telefone} onChange={v => set("telefone", v)} />
          </div>
        </CardContent>
      </Card>

      {/* 2. CSC */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. CSC (Código de Segurança do Contribuinte)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Gerado no portal SEFAZ do seu estado. Necessário para gerar o QR Code da NFC-e.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="CSC ID (idToken)" value={form.csc_id} onChange={v => set("csc_id", v)} placeholder="Ex.: 000001" />
            <Field label="CSC Token" value={form.csc_token} onChange={v => set("csc_token", v)} placeholder="Token secreto" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Ambiente */}
      <Card>
        <CardHeader><CardTitle className="text-base">3. Ambiente</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs">Ambiente Focus NFe</Label>
            <Select value={form.environment} onValueChange={v => set("environment", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                <SelectItem value="producao">Produção (notas reais)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Salvando…</> : "Salvar dados"}
            </Button>
            <Button variant="secondary" onClick={handleSyncFocus} disabled={syncing || !cfg}>
              {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Sincronizando…</> : "Sincronizar empresa com Focus NFe"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Certificado A1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            4. Certificado Digital A1
            {cfg?.certificado_uploaded_at && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3"/>Enviado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Envie o arquivo .pfx e a senha. O certificado é enviado direto para a Focus NFe — não fica salvo no nosso banco.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo (.pfx)</Label>
              <Input ref={fileRef} type="file" accept=".pfx,.p12" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Senha do certificado</Label>
              <Input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <Button onClick={handleUploadCert} disabled={uploading}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Enviando…</> : <><Upload className="w-4 h-4 mr-2"/>Enviar certificado</>}
          </Button>
        </CardContent>
      </Card>

      {/* 5. Credenciais Focus NFe + excedente */}
      <FiscalCredentialsCard orgId={orgId} cfg={cfg} onSaved={onSaved} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ---------- Card de consumo mensal ---------- */
function FiscalQuotaCard({ orgId }: { orgId: string }) {
  const { data: quota, isLoading } = useFiscalQuota(orgId);
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!quota) return null;

  const unlimited = quota.quota === null;
  const used = quota.used || 0;
  const total = quota.quota ?? 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(total, 1)) * 100));
  const nearLimit = !unlimited && total > 0 && (quota.remaining ?? 0) <= Math.ceil(total * 0.1);
  const blocked = quota.blocked && !quota.overage_allowed;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Consumo do mês</span>
          <Badge variant="outline" className="text-xs uppercase">{quota.plan}</Badge>
          {blocked && (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" /> Cota esgotada
            </Badge>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            {unlimited ? `${used} nota(s) — ilimitado` : `${used} / ${total} notas`}
          </span>
        </div>
        {!unlimited && <Progress value={pct} className="h-2" />}
        {(nearLimit || blocked) && (
          <p className={`text-xs ${blocked ? "text-amber-600" : "text-muted-foreground"}`}>
            {quota.reason || "Você está próximo de atingir o limite mensal do seu plano."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Credenciais Focus NFe + excedente ---------- */
function FiscalCredentialsCard({
  orgId, cfg, onSaved,
}: { orgId: string; cfg: FiscalConfig | null; onSaved: () => void }) {
  const { data: quota } = useFiscalQuota(orgId);
  const [mode, setMode] = useState<"platform" | "own">(
    (cfg?.focus_token_mode as "platform" | "own") || "platform",
  );
  const [ownToken, setOwnToken] = useState("");
  const [overage, setOverage] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  // Carrega toggle de excedente
  const { data: org } = useQuery({
    queryKey: ["org_overage", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("organizations")
        .select("nfce_overage_allowed").eq("id", orgId).maybeSingle();
      return data as { nfce_overage_allowed: boolean } | null;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });

  const effectiveOverage = overage ?? !!org?.nfce_overage_allowed;
  const overagePriceCents = quota?.overage_price_cents ?? null;

  async function handleSave() {
    setSaving(true);
    try {
      // 1) Modo do token na fiscal_config
      const { error: e1 } = await supabase.from("fiscal_config")
        .update({ focus_token_mode: mode }).eq("organization_id", orgId);
      if (e1) throw e1;

      // 2) Token próprio (se informado) em organization_secrets
      if (mode === "own" && ownToken.trim()) {
        const { error: e2 } = await supabase.from("organization_secrets")
          .upsert(
            { organization_id: orgId, focus_nfe_token: ownToken.trim() },
            { onConflict: "organization_id" },
          );
        if (e2) throw e2;
      }

      // 3) Excedente
      if (overage !== null && overage !== !!org?.nfce_overage_allowed) {
        const { error: e3 } = await supabase.from("organizations")
          .update({ nfce_overage_allowed: overage }).eq("id", orgId);
        if (e3) throw e3;
      }

      toast.success("Credenciais fiscais salvas");
      setOwnToken("");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar credenciais");
    } finally { setSaving(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">5. Credenciais Focus NFe</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Escolha usar o token da nossa Software House (mais simples) ou seu próprio token Focus NFe (avançado).
        </p>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "platform" | "own")}>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="platform" id="fmode-plat" />
            <Label htmlFor="fmode-plat" className="text-sm cursor-pointer">
              <span className="font-medium">Usar plataforma</span>
              <span className="block text-xs text-muted-foreground">Emissão pelo token da nossa Software House. Sujeito à cota do plano.</span>
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="own" id="fmode-own" />
            <Label htmlFor="fmode-own" className="text-sm cursor-pointer">
              <span className="font-medium">Meu próprio token Focus NFe</span>
              <span className="block text-xs text-muted-foreground">Você paga a Focus direto; sem cota da plataforma.</span>
            </Label>
          </div>
        </RadioGroup>

        {mode === "own" && (
          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs">Token Focus NFe</Label>
            <Input
              type="password"
              value={ownToken}
              onChange={(e) => setOwnToken(e.target.value)}
              placeholder="Cole aqui seu token de produção Focus NFe"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Guardado de forma segura. Deixe em branco para manter o token atual.
            </p>
          </div>
        )}

        {overagePriceCents !== null && (
          <>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Permitir excedente pago</div>
                <div className="text-xs text-muted-foreground">
                  Continua emitindo após esgotar a cota — R$ {(overagePriceCents / 100).toFixed(2)} por nota extra.
                </div>
              </div>
              <Switch
                checked={effectiveOverage}
                onCheckedChange={(v) => setOverage(v)}
              />
            </div>
          </>
        )}

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Salvando…</> : "Salvar credenciais"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}