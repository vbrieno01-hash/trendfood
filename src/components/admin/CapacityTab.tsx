import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, Users, Store, ShoppingBag, AlertTriangle, CheckCircle2, ArrowUpRight, HardDrive, Search, Trash2, Shield, ShieldOff, MessageSquare, Save, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePlatformFeatureFlags, useUpdatePlatformFeatureFlags } from "@/hooks/usePlatformFeatureFlags";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CapacityStats {
  db_size_bytes: number;
  users_count: number;
  orgs_total: number;
  orgs_free: number;
  orgs_pro: number;
  orgs_enterprise: number;
  orgs_lifetime: number;
  orgs_trial_active: number;
  orders_total: number;
  orders_30d: number;
  top_tables: { table_name: string; size_bytes: number; size_pretty: string }[];
  generated_at: string;
}

const INSTANCES = [
  { name: "Pico", ram: "0.5 GB", db_mb: 500, stores: "30–50", orders_month: "~10k" },
  { name: "Micro", ram: "1 GB", db_mb: 1024, stores: "~100", orders_month: "~30k" },
  { name: "Small", ram: "2 GB", db_mb: 4096, stores: "~300", orders_month: "~100k" },
  { name: "Medium", ram: "4 GB", db_mb: 8192, stores: "~800", orders_month: "~300k" },
  { name: "Large", ram: "8 GB", db_mb: 16384, stores: "~2k", orders_month: "~1M" },
];

// Heurística: assume instância atual baseada no tamanho do banco
function detectCurrentInstance(dbBytes: number): typeof INSTANCES[number] {
  const dbMb = dbBytes / 1024 / 1024;
  if (dbMb < 400) return INSTANCES[0];
  if (dbMb < 850) return INSTANCES[1];
  if (dbMb < 3500) return INSTANCES[2];
  if (dbMb < 7000) return INSTANCES[3];
  return INSTANCES[4];
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function CapacityTab() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["admin-capacity-stats"],
    queryFn: async (): Promise<CapacityStats> => {
      const { data, error } = await supabase.rpc("get_platform_capacity_stats" as any);
      if (error) throw error;
      return data as unknown as CapacityStats;
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-glass rounded-2xl p-6 text-sm text-destructive">
        Erro ao carregar estatísticas: {(error as any)?.message || "desconhecido"}
      </div>
    );
  }

  const currentInstance = detectCurrentInstance(data.db_size_bytes);
  const dbMb = data.db_size_bytes / 1024 / 1024;
  const usagePct = Math.min(100, (dbMb / currentInstance.db_mb) * 100);
  const alertLevel: "ok" | "warn" | "danger" = usagePct >= 80 ? "danger" : usagePct >= 60 ? "warn" : "ok";

  const updated = new Date(dataUpdatedAt).toLocaleTimeString("pt-BR");

  return (
    <div className="space-y-6 animate-admin-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary/60" />
            <h2 className="text-sm font-bold text-foreground">Capacidade da Plataforma</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Atualizado às {updated} • auto-refresh a cada 30s
          </p>
        </div>
      </div>

      {/* Alerta de uso */}
      <FeatureFlagsSection />
      <UazapiMasterSection />

      {alertLevel !== "ok" && (
        <div
          className={`rounded-2xl p-4 border ${
            alertLevel === "danger"
              ? "bg-destructive/10 border-destructive/40 text-destructive"
              : "bg-yellow-500/10 border-yellow-500/40 text-yellow-700 dark:text-yellow-400"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">
                {alertLevel === "danger"
                  ? `Banco em ${usagePct.toFixed(0)}% da capacidade da instância ${currentInstance.name}`
                  : `Banco em ${usagePct.toFixed(0)}% — fique de olho`}
              </p>
              <p className="text-xs opacity-90">
                Considere subir para a instância <strong>
                  {INSTANCES[Math.min(INSTANCES.length - 1, INSTANCES.indexOf(currentInstance) + 1)].name}
                </strong>{" "}
                em <strong>Cloud → Overview → Advanced settings</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Usuários" value={data.users_count.toString()} />
        <StatCard
          icon={<Store className="w-4 h-4" />}
          label="Lojas"
          value={data.orgs_total.toString()}
          sub={`${data.orgs_free} free • ${data.orgs_pro + data.orgs_enterprise + data.orgs_lifetime} pagas`}
        />
        <StatCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Pedidos (30d)"
          value={data.orders_30d.toLocaleString("pt-BR")}
          sub={`${data.orders_total.toLocaleString("pt-BR")} total`}
        />
        <StatCard
          icon={<HardDrive className="w-4 h-4" />}
          label="Banco usado"
          value={fmtBytes(data.db_size_bytes)}
          sub={`${usagePct.toFixed(1)}% de ${currentInstance.name}`}
        />
      </div>

      {/* Lojas por plano */}
      <div className="admin-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Lojas por plano</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <PlanPill label="Free" count={data.orgs_free} color="muted" />
          <PlanPill label="Trial ativo" count={data.orgs_trial_active} color="amber" />
          <PlanPill label="Pro" count={data.orgs_pro} color="primary" />
          <PlanPill label="Enterprise" count={data.orgs_enterprise} color="purple" />
          <PlanPill label="Lifetime" count={data.orgs_lifetime} color="emerald" />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Trial ativo já é contado em "Free" (são lojas free com trial vigente).
        </p>
      </div>

      {/* Lista de usuários */}
      <UsersSection />

      {/* Barra de uso do banco */}
      <div className="admin-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">Uso do banco — instância {currentInstance.name}</h3>
          <span className="text-xs font-medium text-muted-foreground">
            {fmtBytes(data.db_size_bytes)} / ~{currentInstance.db_mb} MB
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              alertLevel === "danger" ? "bg-destructive" : alertLevel === "warn" ? "bg-yellow-500" : "bg-primary"
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          {alertLevel === "ok" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Folga confortável. Tudo tranquilo.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Próximo do limite prático da instância atual.</span>
            </>
          )}
        </div>
      </div>

      {/* Tabela de instâncias */}
      <div className="admin-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-1">Capacidade por instância (estimativa)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          O Lovable Cloud cobra por uso, não por usuário. Os números abaixo são <strong>estimativas práticas</strong>{" "}
          baseadas no consumo médio atual (~10 MB por loja ativa, ~140 KB por pedido).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <th className="py-2 pr-3">Instância</th>
                <th className="py-2 pr-3">RAM</th>
                <th className="py-2 pr-3">Banco confortável</th>
                <th className="py-2 pr-3">Lojas</th>
                <th className="py-2 pr-3">Pedidos/mês</th>
              </tr>
            </thead>
            <tbody>
              {INSTANCES.map((inst) => {
                const isCurrent = inst.name === currentInstance.name;
                return (
                  <tr
                    key={inst.name}
                    className={`border-b border-border/20 ${isCurrent ? "bg-primary/5" : ""}`}
                  >
                    <td className="py-2.5 pr-3 font-medium">
                      {inst.name}{" "}
                      {isCurrent && (
                        <span className="ml-1 text-[10px] font-bold text-primary uppercase">atual</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{inst.ram}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">~{inst.db_mb} MB</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{inst.stores}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{inst.orders_month}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <a
          href="https://docs.lovable.dev/integrations/cloud"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-4"
        >
          Como mudar de instância <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>

      {/* Top tabelas */}
      <div className="admin-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Maiores tabelas do banco</h3>
        <div className="space-y-2">
          {data.top_tables.map((t) => {
            const pct = (t.size_bytes / data.db_size_bytes) * 100;
            return (
              <div key={t.table_name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-foreground">{t.table_name}</span>
                  <span className="text-muted-foreground">
                    {t.size_pretty} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary/60" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota sobre imagens */}
      <div className="admin-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-2">Imagens (storage)</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Todas as imagens enviadas (logos, banners, cardápio) são <strong>comprimidas automaticamente</strong> antes do
          upload: logos 800×800, banners 1200×800, com segundo passe agressivo se ainda passarem do limite. Isso mantém o
          consumo de Storage baixo. O tamanho exato dos buckets não aparece aqui pois só é visível no painel Cloud →
          Storage.
        </p>
      </div>
    </div>
  );
}

function FeatureFlagsSection() {
  const { data: flags, isLoading } = usePlatformFeatureFlags();
  const updateMut = useUpdatePlatformFeatureFlags();

  const toggleIfood = async (next: boolean) => {
    try {
      await updateMut.mutateAsync({ ifood_enabled: next });
      toast.success(
        next
          ? "iFood liberado para todos os lojistas (até 30s para refletir)"
          : "iFood escondido — lojistas verão 'Em breve'"
      );
    } catch (e: any) {
      toast.error("Falha ao atualizar: " + (e.message || "erro desconhecido"));
    }
  };

  const toggleWhatsapp = async (next: boolean) => {
    try {
      await updateMut.mutateAsync({ whatsapp_enabled: next });
      toast.success(
        next
          ? "Robô do WhatsApp liberado para os lojistas (até 30s para refletir)"
          : "Robô do WhatsApp escondido — lojistas verão 'Em breve'"
      );
    } catch (e: any) {
      toast.error("Falha ao atualizar: " + (e.message || "erro desconhecido"));
    }
  };

  return (
    <div className="rounded-2xl p-4 border bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-bold">Funcionalidades em rollout</h3>
      </div>
      <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/40">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">🛵</span>
            <span className="text-sm font-semibold">Integração iFood</span>
            {!flags?.ifood_enabled && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400">
                Em breve
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Quando ligado, lojas Pro/Enterprise enxergam a tela de conexão. Quando desligado, todos veem só "Em breve". Você (admin) sempre vê tudo.
          </p>
        </div>
        <Switch
          checked={!!flags?.ifood_enabled}
          disabled={isLoading || updateMut.isPending}
          onCheckedChange={toggleIfood}
        />
      </div>
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/40">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <span className="text-sm font-semibold">Robô do WhatsApp</span>
            {!flags?.whatsapp_enabled && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400">
                Em breve
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Quando ligado, lojas Pro/Enterprise enxergam o painel de mensagens automáticas. Quando desligado, todos veem só "Em breve". Você (admin) sempre vê tudo.
          </p>
        </div>
        <Switch
          checked={!!flags?.whatsapp_enabled}
          disabled={isLoading || updateMut.isPending}
          onCheckedChange={toggleWhatsapp}
        />
      </div>
      </div>
    </div>
  );
}

function UazapiMasterSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["uazapi-master-config"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("platform_config") as any)
        .select("uazapi_server_url, uazapi_admin_token")
        .eq("id", "singleton")
        .maybeSingle();
      if (error) throw error;
      return data as { uazapi_server_url: string | null; uazapi_admin_token: string | null } | null;
    },
    staleTime: 30_000,
  });
  const [serverUrl, setServerUrl] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [touched, setTouched] = useState(false);
  const [testing, setTesting] = useState(false);

  useMemo(() => {
    if (data && !touched) {
      setServerUrl(data.uazapi_server_url ?? "");
      setAdminToken(data.uazapi_admin_token ?? "");
    }
  }, [data, touched]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        uazapi_server_url: serverUrl.trim() || null,
      };
      // Só sobrescreve o token se o usuário digitou algo (preserva o existente)
      if (adminToken && !adminToken.includes("•")) {
        payload.uazapi_admin_token = adminToken.trim() || null;
      }
      const { error } = await supabase
        .from("platform_config")
        .update(payload)
        .eq("id", "singleton");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Credenciais Uazapi salvas");
      setTouched(false);
      qc.invalidateQueries({ queryKey: ["uazapi-master-config"] });
      qc.invalidateQueries({ queryKey: ["platform_feature_flags"] });
    },
    onError: (e: any) => toast.error("Falha ao salvar: " + (e?.message ?? "erro")),
  });

  async function testConnection() {
    setTesting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-server-info`,
        { headers: { Authorization: `Bearer ${sess.session?.access_token}` } },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Falha na conexão");
      toast.success("Servidor Uazapi respondeu OK ✓");
    } catch (e: any) {
      toast.error("Teste falhou: " + (e?.message ?? "erro"));
    } finally {
      setTesting(false);
    }
  }

  const hasToken = !!(data?.uazapi_admin_token);
  const tokenPlaceholder = hasToken ? "••••••••••••• (configurado — deixe em branco para manter)" : "Cole o admin token da Uazapi";

  return (
    <div className="rounded-2xl p-4 border bg-card">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-bold">Credenciais mestre Uazapi (WhatsApp)</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        Usadas pelo backend para criar instâncias de WhatsApp para os lojistas. O token nunca é exposto para o lojista.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Server URL</label>
          <Input
            placeholder="https://trendfood.uazapi.com"
            value={serverUrl}
            disabled={isLoading}
            onChange={(e) => { setServerUrl(e.target.value); setTouched(true); }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Admin Token</label>
          <Input
            type="password"
            placeholder={tokenPlaceholder}
            value={adminToken.includes("•") ? "" : adminToken}
            disabled={isLoading}
            onChange={(e) => { setAdminToken(e.target.value); setTouched(true); }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !touched}>
          {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={testConnection} disabled={testing || !data?.uazapi_server_url}>
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Wifi className="w-3.5 h-3.5 mr-1.5" />}
          Testar conexão
        </Button>
        {hasToken && <span className="text-[11px] text-emerald-600 dark:text-emerald-400 ml-auto">● configurado</span>}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="admin-glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function PlanPill({ label, count, color }: { label: string; count: number; color: "muted" | "amber" | "primary" | "purple" | "emerald" }) {
  const styles: Record<typeof color, string> = {
    muted: "bg-muted/60 text-muted-foreground",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    primary: "bg-primary/15 text-primary",
    purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className={`rounded-xl p-3 ${styles[color]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5">{count}</div>
    </div>
  );
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  last_activity_at: string | null;
  provider: string;
  org_count: number;
  org_names: string[];
  is_admin: boolean;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) {
    const h = Math.floor(diff / 3600000);
    return h < 1 ? "agora" : `${h}h`;
  }
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mes`;
  return `${Math.floor(days / 365)}a`;
}

function UsersSection() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [onlyNoOrg, setOnlyNoOrg] = useState(false);
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc("admin_list_users" as any);
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
    staleTime: 30_000,
  });

  const toggleAdminMut = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_toggle_admin_role" as any, { _user_id: userId, _grant: grant });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.grant ? "Promovido a admin" : "Admin removido");
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const deleteMut = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_delete_user" as any, { _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário deletado");
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
      qc.invalidateQueries({ queryKey: ["admin-capacity-stats"] });
      setDeleteTarget(null);
      setConfirmEmail("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao deletar"),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((u) => {
      if (onlyNoOrg && u.org_count > 0) return false;
      if (onlyAdmins && !u.is_admin) return false;
      if (q && !u.email?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, onlyNoOrg, onlyAdmins]);

  return (
    <div className="admin-glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-foreground">
          Usuários cadastrados {data && <span className="text-muted-foreground font-normal">({filtered.length}/{data.length})</span>}
        </h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px] max-[380px]:min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Button
          variant={onlyNoOrg ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setOnlyNoOrg((v) => !v)}
        >
          Sem loja
        </Button>
        <Button
          variant={onlyAdmins ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setOnlyAdmins((v) => !v)}
        >
          Admins
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-xs text-destructive">Erro: {(error as any)?.message}</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Nenhum usuário encontrado.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <th className="py-2 px-2">Email</th>
                <th className="py-2 px-2">Cadastro</th>
                <th className="py-2 px-2">Última atividade</th>
                <th className="py-2 px-2">Lojas</th>
                <th className="py-2 px-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground truncate max-w-[200px]" title={u.email}>{u.email}</span>
                      {u.is_admin && (
                        <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded">admin</span>
                      )}
                      {u.provider === "google" && (
                        <span className="text-[10px] text-muted-foreground">G</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground tabular-nums">{fmtRelative(u.created_at)}</td>
                  <td className="py-2 px-2 text-muted-foreground tabular-nums">{fmtRelative(u.last_activity_at ?? u.last_sign_in_at)}</td>
                  <td className="py-2 px-2">
                    {u.org_count === 0 ? (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">sem loja</span>
                    ) : (
                      <span
                        className="text-xs font-medium text-foreground"
                        title={u.org_names.join(", ")}
                      >
                        {u.org_count} {u.org_count === 1 ? "loja" : "lojas"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title={u.is_admin ? "Remover admin" : "Tornar admin"}
                        disabled={toggleAdminMut.isPending}
                        onClick={() => toggleAdminMut.mutate({ userId: u.id, grant: !u.is_admin })}
                      >
                        {u.is_admin ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Deletar usuário"
                        onClick={() => { setDeleteTarget(u); setConfirmEmail(""); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setConfirmEmail(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga permanentemente <strong>{deleteTarget?.email}</strong>
              {deleteTarget && deleteTarget.org_count > 0 && (
                <> e <strong>{deleteTarget.org_count} loja(s)</strong> vinculada(s) (com pedidos, cardápio, etc)</>
              )}.
              Não tem como desfazer. Digite o email pra confirmar:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={deleteTarget?.email}
            className="text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmEmail !== deleteTarget?.email || deleteMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMut.mutate(deleteTarget.id);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Deletando..." : "Deletar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
