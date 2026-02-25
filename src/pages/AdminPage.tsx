import { useState, useEffect, useMemo } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import GrowthCharts from "@/components/admin/GrowthCharts";
import PlatformConfigSection from "@/components/admin/PlatformConfigSection";
import AdminDownloadsSection from "@/components/admin/AdminDownloadsSection";
import PlansConfigSection from "@/components/admin/PlansConfigSection";
import TrialConfigSection from "@/components/admin/TrialConfigSection";
import SalesChatTab from "@/components/admin/SalesChatTab";
import ErrorLogsTab from "@/components/admin/ErrorLogsTab";
import logoIcon from "@/assets/logo-icon.png";
import {
  Store,
  ShieldAlert,
  TrendingUp,
  ExternalLink,
  Loader2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  MessageCircle,
  Sparkles,
  DollarSign,
  ArrowRight,
  Download,
  Crown,
  CalendarPlus,
  Users,
  
  Printer,
  Home,
  Menu,
  LogOut,
  Settings,
} from "lucide-react";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
];

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PLAN_OPTIONS = [
  { value: "free", label: "Grátis" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
  { value: "lifetime", label: "Vitalício" },
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  store_address: string | null;
  created_at: string;
  subscription_status: string;
  subscription_plan: string;
  trial_ends_at: string | null;
  emoji: string;
  menu_items_count: number;
  whatsapp: string | null;
  business_hours: object | null;
}

// ── Feature Roadmap data ──
type FeatureStatus = "available" | "beta" | "soon" | "planned";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: FeatureStatus;
  minPlan: "free" | "pro" | "enterprise";
  actionLabel?: string;
  actionHref?: string;
}

const MIN_PLAN_CONFIG: Record<"free" | "pro" | "enterprise", { label: string; className: string }> = {
  free: { label: "Todos os planos", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  pro: { label: "Pro+", className: "bg-primary/15 text-primary" },
  enterprise: { label: "Enterprise", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
};

const FEATURES: Feature[] = [
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "Suporte via WhatsApp",
    description: "Atendimento direto pelo WhatsApp para tirar dúvidas e resolver problemas em tempo real.",
    status: "available",
    minPlan: "free",
    actionLabel: "Abrir suporte",
    actionHref: "https://wa.me/5511999999999?text=Olá%2C%20preciso%20de%20suporte%20com%20o%20TrendFood",
  },
  {
    icon: <Printer className="w-5 h-5" />,
    title: "Impressora Térmica",
    description: "Impressão automática de pedidos em impressoras térmicas 80mm com QR Code PIX.",
    status: "beta",
    minPlan: "pro",
    actionLabel: "Ver documentação",
    actionHref: "/docs/impressora-termica",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Onboarding Guiado",
    description: "Wizard passo a passo para novas lojas configurarem nome, endereço, horários e primeiro item do cardápio.",
    status: "available",
    minPlan: "free",
    actionLabel: "Ver no dashboard",
    actionHref: "/dashboard",
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: "Controle de Caixa",
    description: "Abertura e fechamento de caixa com saldo inicial, sangrias e relatório do turno.",
    status: "available",
    minPlan: "pro",
    actionLabel: "Ver no dashboard",
    actionHref: "/dashboard",
  },
];

const STATUS_CONFIG: Record<FeatureStatus, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  beta: { label: "Beta", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  soon: { label: "Em breve", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { label: "Planejado", className: "bg-muted text-muted-foreground" },
};

type AdminTab = "home" | "lojas" | "config" | "features" | "vendas" | "logs";

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth?redirect=/admin" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <AdminContent />;
}

function AdminContent() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial">("all");
  const [addressFilter, setAddressFilter] = useState<"all" | "with" | "without">("all");
  const [activeTab, setActiveTab] = useState<AdminTab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: orgsData }, { data: menuData }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug, store_address, created_at, subscription_status, subscription_plan, trial_ends_at, emoji, whatsapp, business_hours")
          .order("created_at", { ascending: false }),
        supabase.from("menu_items").select("organization_id"),
      ]);

      if (!orgsData) { setLoading(false); return; }

      const menuCount: Record<string, number> = {};
      (menuData ?? []).forEach((m) => {
        menuCount[m.organization_id] = (menuCount[m.organization_id] ?? 0) + 1;
      });

      const enriched: OrgRow[] = orgsData.map((org) => ({
        ...org,
        subscription_plan: org.subscription_plan ?? "free",
        trial_ends_at: org.trial_ends_at ?? null,
        menu_items_count: menuCount[org.id] ?? 0,
        whatsapp: org.whatsapp ?? null,
        business_hours: org.business_hours as object | null,
      }));

      setOrgs(enriched);
      setLoading(false);
    }
    load();
  }, []);

  // ── SaaS KPIs ──
  const payingOrgs = useMemo(() => orgs.filter((o) => o.subscription_plan !== "free" && o.subscription_plan !== "lifetime"), [orgs]);
  const _lifetimeCount = useMemo(() => orgs.filter((o) => o.subscription_plan === "lifetime").length, [orgs]);
  const proCount = useMemo(() => orgs.filter((o) => o.subscription_plan === "pro").length, [orgs]);
  const enterpriseCount = useMemo(() => orgs.filter((o) => o.subscription_plan === "enterprise").length, [orgs]);
  const mrr = proCount * 99 + enterpriseCount * 249;
  

  // ── Financial metrics ──
  const trialCount = useMemo(() => orgs.filter((o) => {
    if (!o.trial_ends_at) return false;
    return new Date(o.trial_ends_at) > new Date();
  }).length, [orgs]);

  const subscriberDetails = useMemo(() => {
    const now = new Date();
    return payingOrgs.map((o) => {
      const created = new Date(o.created_at);
      const monthsActive = Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const planValue = o.subscription_plan === "enterprise" ? 249 : 99;
      const totalEstimated = monthsActive * planValue;
      return { ...o, monthsActive, planValue, totalEstimated };
    });
  }, [payingOrgs]);

  const totalRevenue = useMemo(() => subscriberDetails.reduce((acc, s) => acc + s.totalEstimated, 0), [subscriberDetails]);

  // Filtered list
  const filteredOrgs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orgs
      .filter((org) =>
        q === "" || org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q)
      )
      .filter((org) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return org.subscription_status === "active";
        return org.subscription_status !== "active";
      })
      .filter((org) => {
        if (addressFilter === "all") return true;
        if (addressFilter === "with") return !!org.store_address;
        return !org.store_address;
      });
  }, [orgs, search, statusFilter, addressFilter]);

  const hasActiveFilters = search !== "" || statusFilter !== "all" || addressFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setAddressFilter("all");
  }

  // ── CSV Export ──
  function exportStoresCSV() {
    const header = "Nome,Slug,Endereço,Status,Plano,Itens,Criado em\n";
    const rows = filteredOrgs.map((o) =>
      `"${o.name}","${o.slug}","${o.store_address ?? ""}","${o.subscription_status}","${o.subscription_plan}",${o.menu_items_count},"${new Date(o.created_at).toLocaleDateString("pt-BR")}"`
    ).join("\n");
    downloadCSV(header + rows, "lojas.csv");
  }

  // ── Plan update ──
  async function handlePlanChange(orgId: string, plan: string) {
    const { error } = await supabase
      .from("organizations")
      .update({ subscription_plan: plan })
      .eq("id", orgId);
    if (error) { toast.error("Erro ao atualizar plano"); return; }
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, subscription_plan: plan } : o));
    toast.success("Plano atualizado!");
  }

  async function handleExtendTrial(orgId: string) {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 7);
    const { error } = await supabase
      .from("organizations")
      .update({ trial_ends_at: newDate.toISOString() })
      .eq("id", orgId);
    if (error) { toast.error("Erro ao estender trial"); return; }
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, trial_ends_at: newDate.toISOString() } : o));
    toast.success("Trial estendido por +7 dias!");
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  // ── Nav items ──
  const navItems: { key: AdminTab; icon: React.ReactNode; label: string }[] = [
    { key: "home", icon: <Home className="w-4 h-4" />, label: "Home" },
    { key: "lojas", icon: <Store className="w-4 h-4" />, label: "Lojas" },
    { key: "config", icon: <Settings className="w-4 h-4" />, label: "Configurações" },
    { key: "features", icon: <Sparkles className="w-4 h-4" />, label: "Funcionalidades" },
    { key: "vendas", icon: <MessageCircle className="w-4 h-4" />, label: "Vendas" },
    { key: "logs", icon: <AlertCircle className="w-4 h-4" />, label: "Logs" },
  ];

  const navBtnClass = (key: AdminTab) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
      activeTab === key
        ? "bg-primary text-white shadow-sm shadow-primary/30"
        : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-64 transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
        style={{ background: "#111111" }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="TrendFood" className="w-8 h-8 rounded-xl object-contain shadow-lg shadow-primary/30" />
            <span className="font-extrabold text-white text-base tracking-tight">TrendFood</span>
          </Link>
        </div>

        {/* Admin info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">Admin</p>
              <p className="text-white/40 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={navBtnClass(item.key)}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-0.5">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/10 hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Painel Admin</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* ── Home Tab ── */}
          {activeTab === "home" && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard
                  icon={<DollarSign className="w-5 h-5" />}
                  label="Receita Total Estimada"
                  value={loading ? null : fmt(totalRevenue)}
                  color="text-emerald-600 dark:text-emerald-400"
                  bg="bg-emerald-500/10"
                />
                <KpiCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="MRR (Receita Recorrente)"
                  value={loading ? null : fmt(mrr)}
                  color="text-blue-600 dark:text-blue-400"
                  bg="bg-blue-500/10"
                />
                <KpiCard
                  icon={<CalendarPlus className="w-5 h-5" />}
                  label="A Receber (Mês)"
                  value={loading ? null : fmt(mrr)}
                  color="text-violet-600 dark:text-violet-400"
                  bg="bg-violet-500/10"
                />
                <KpiCard
                  icon={<Store className="w-5 h-5" />}
                  label="Lojas Cadastradas"
                  value={loading ? null : orgs.length.toString()}
                  color="text-cyan-600 dark:text-cyan-400"
                  bg="bg-cyan-500/10"
                />
                <KpiCard
                  icon={<Users className="w-5 h-5" />}
                  label="Assinantes Ativos"
                  value={loading ? null : payingOrgs.length.toString()}
                  color="text-orange-600 dark:text-orange-400"
                  bg="bg-orange-500/10"
                />
                <KpiCard
                  icon={<Sparkles className="w-5 h-5" />}
                  label="Trials Ativos"
                  value={loading ? null : trialCount.toString()}
                  color="text-amber-600 dark:text-amber-400"
                  bg="bg-amber-500/10"
                />
              </div>
              {!loading && <GrowthCharts orgs={orgs} />}

              {/* ── Detalhamento de Assinantes ── */}
              {!loading && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground">Detalhamento de Assinantes</h2>
                  </div>
                  {subscriberDetails.length === 0 ? (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center">
                      <p className="text-sm text-muted-foreground">Nenhum assinante pago ainda</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Loja</th>
                              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Plano</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Valor/mês</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Meses Ativos</th>
                              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total Estimado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subscriberDetails.map((s) => (
                              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 font-medium">{s.emoji} {s.name}</td>
                                <td className="px-4 py-3">
                                  <Badge variant="secondary" className="text-xs capitalize">{s.subscription_plan}</Badge>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">{fmt(s.planValue)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{s.monthsActive}</td>
                                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(s.totalEstimated)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/30">
                              <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Total</td>
                              <td className="px-4 py-3 text-right font-bold tabular-nums">{fmt(totalRevenue)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* ── Lojas Tab ── */}
          {activeTab === "lojas" && (
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Lojas da Plataforma
                </h2>
                {!loading && filteredOrgs.length > 0 && (
                  <button
                    onClick={exportStoresCSV}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar CSV
                  </button>
                )}
              </div>

              {/* Filter bar */}
              {!loading && orgs.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar por nome ou URL da loja…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm bg-muted/40 border-0 focus-visible:ring-1"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium shrink-0">Status:</span>
                      {(["all", "active", "trial"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setStatusFilter(v)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                            statusFilter === v
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {v === "all" ? "Todos" : v === "active" ? "Ativo" : "Trial"}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium shrink-0">Endereço:</span>
                      {(["all", "with", "without"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setAddressFilter(v)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                            addressFilter === v
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {v === "all" ? "Todos" : v === "with" ? "Com endereço" : "Sem endereço"}
                        </button>
                      ))}
                    </div>

                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {filteredOrgs.length === orgs.length
                        ? `${orgs.length} lojas`
                        : `${filteredOrgs.length} de ${orgs.length}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Grid / states */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))}
                </div>
              ) : orgs.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  Nenhuma loja cadastrada ainda.
                </div>
              ) : filteredOrgs.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <p className="text-muted-foreground text-sm">Nenhuma loja encontrada com esses filtros.</p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrgs.map((org) => (
                    <StoreCard key={org.id} org={org} onPlanChange={handlePlanChange} onExtendTrial={handleExtendTrial} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Config Tab ── */}
          {activeTab === "config" && (
            <div className="space-y-6">
              <PlansConfigSection />
              <TrialConfigSection />
              <PlatformConfigSection />
              <AdminDownloadsSection />
            </div>
          )}

          {/* ── Features Tab ── */}
          {activeTab === "features" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Funcionalidades da Plataforma</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map((f) => (
                  <FeatureCard key={f.title} feature={f} />
                ))}
              </div>
            </section>
          )}

          {/* ── Vendas Tab ── */}
          {activeTab === "vendas" && <SalesChatTab />}

          {/* ── Logs Tab ── */}
          {activeTab === "logs" && <ErrorLogsTab />}

        </main>
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({
  icon, label, value, color, bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        {icon}
      </div>
      {value === null ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      )}
      <p className="text-xs text-muted-foreground leading-snug">{label}</p>
    </div>
  );
}

/* ── Setup Score ── */
function SetupScore({ org }: { org: OrgRow }) {
  const checks = [
    !!org.store_address,
    !!org.whatsapp,
    org.menu_items_count > 0,
    !!org.business_hours,
  ];
  const score = checks.filter(Boolean).length;
  const pct = score * 25;
  return (
    <div className="px-5 pb-4 space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Setup</span>
        <span className={pct === 100 ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Store Card ── */
function StoreCard({ org, onPlanChange, onExtendTrial }: { org: OrgRow; onPlanChange: (id: string, plan: string) => void; onExtendTrial: (id: string) => void }) {
  const avatarColor = getAvatarColor(org.name);
  const initial = org.name.charAt(0).toUpperCase();
  const isActive = org.subscription_status === "active";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="p-5 flex items-start gap-3 flex-1">
        <div
          className={`w-11 h-11 rounded-xl ${avatarColor} flex items-center justify-center text-white font-bold text-lg shrink-0`}
        >
          {org.emoji !== "🍽️" ? org.emoji : initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{org.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                /unidade/{org.slug}
              </p>
            </div>
            <a
              href={`/unidade/${org.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Abrir loja"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge
              className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {isActive ? "Ativo" : "Trial"}
            </Badge>
            {org.store_address ? (
              <Badge className="text-xs px-2 py-0.5 rounded-full border-0 font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Endereço OK
              </Badge>
            ) : (
              <Badge className="text-xs px-2 py-0.5 rounded-full border-0 font-medium bg-muted text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Sem endereço
              </Badge>
            )}
            <Badge className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium ${
              org.subscription_plan === "lifetime" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
              org.subscription_plan === "enterprise" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" :
              org.subscription_plan === "pro" ? "bg-primary/15 text-primary" :
              "bg-muted text-muted-foreground"
            }`}>
              {org.subscription_plan === "lifetime" ? "Vitalício" : org.subscription_plan === "enterprise" ? "Enterprise" : org.subscription_plan === "pro" ? "Pro" : "Free"}
            </Badge>
          </div>
        </div>
      </div>

      <SetupScore org={org} />

      <div className="border-t border-border px-5 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Plano:</span>
          </div>
          <select
            value={org.subscription_plan}
            onChange={(e) => onPlanChange(org.id, e.target.value)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {org.trial_ends_at && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Trial até {new Date(org.trial_ends_at).toLocaleDateString("pt-BR")}
            </span>
            <button
              onClick={() => onExtendTrial(org.id)}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <CalendarPlus className="w-3 h-3" />
              +7 dias
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-border px-5 py-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Desde {new Date(org.created_at).toLocaleDateString("pt-BR")}
        </span>
        <Link
          to={`/unidade/${org.slug}`}
          className="text-xs text-primary hover:underline font-medium"
        >
          Ver loja →
        </Link>
      </div>
    </div>
  );
}

/* ── Feature Card ── */
function FeatureCard({ feature }: { feature: Feature }) {
  const { label, className } = STATUS_CONFIG[feature.status];
  const planBadge = MIN_PLAN_CONFIG[feature.minPlan];
  const isActionable = feature.status === "available" || feature.status === "beta";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {feature.icon}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${planBadge.className}`}>
            {planBadge.label}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${className}`}>
            {label}
          </span>
        </div>
      </div>
      <div className="space-y-1 flex-1">
        <p className="text-sm font-semibold text-foreground">{feature.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
      </div>
      {isActionable && feature.actionLabel && feature.actionHref && (
        <a
          href={feature.actionHref}
          target={feature.actionHref.startsWith("http") ? "_blank" : undefined}
          rel={feature.actionHref.startsWith("http") ? "noopener noreferrer" : undefined}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-auto"
        >
          {feature.actionLabel}
          <ArrowRight className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
