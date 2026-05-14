import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Database, Users, Store, ShoppingBag, AlertTriangle, CheckCircle2, ArrowUpRight, HardDrive } from "lucide-react";

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
