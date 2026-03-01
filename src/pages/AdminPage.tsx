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
import ActivationLogsTab from "@/components/admin/ActivationLogsTab";
import ManageSubscriptionDialog from "@/components/admin/ManageSubscriptionDialog";
import WhatsAppConnectTab from "@/components/admin/WhatsAppConnectTab";
import ReferralsTab from "@/components/admin/ReferralsTab";
import AdminGuideTab from "@/components/admin/AdminGuideTab";
import DeleteUnitDialog from "@/components/dashboard/DeleteUnitDialog";
import logoIcon from "@/assets/logo-icon.png";
import {
  Store,
  ShieldAlert,
  TrendingUp,
  ExternalLink,
  Loader2,
  
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
  Share2,
  Printer,
  Home,
  Menu,
  LogOut,
  Settings,
  ScrollText,
  Smartphone,
  Trash2,
  LayoutDashboard,
  Globe,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
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

async function processReferralBonusClient(activatedOrgId: string, activatedOrgName: string) {
  try {
    const { data: activatedOrg } = await supabase
      .from("organizations")
      .select("referred_by_id, billing_cycle")
      .eq("id", activatedOrgId)
      .single();

    if (!activatedOrg?.referred_by_id) return;

    const referrerId = activatedOrg.referred_by_id;

    const { data: existing } = await (supabase.from("referral_bonuses") as any)
      .select("id")
      .eq("referrer_org_id", referrerId)
      .eq("referred_org_id", activatedOrgId)
      .maybeSingle();

    if (existing) return;

    const bonusDays = (activatedOrg as any)?.billing_cycle === "annual" ? 30 : 10;

    await (supabase.from("referral_bonuses") as any).insert({
      referrer_org_id: referrerId,
      referred_org_id: activatedOrgId,
      bonus_days: bonusDays,
      referred_org_name: activatedOrgName,
    });

    const { data: referrerOrg } = await supabase
      .from("organizations")
      .select("trial_ends_at, name")
      .eq("id", referrerId)
      .single();

    if (referrerOrg) {
      const currentExpiry = referrerOrg.trial_ends_at
        ? new Date(referrerOrg.trial_ends_at)
        : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + bonusDays * 24 * 60 * 60 * 1000);

      await supabase
        .from("organizations")
        .update({ trial_ends_at: newExpiry.toISOString() })
        .eq("id", referrerId);

      await (supabase.from("activation_logs") as any).insert({
        organization_id: referrerId,
        org_name: referrerOrg.name || null,
        source: "referral_bonus",
        notes: `+${bonusDays} dias por indicar "${activatedOrgName}" (org ${activatedOrgId})`,
      });
    }
  } catch (err) {
    console.error("[referral] Bonus error (non-blocking):", err);
  }
}

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

type AdminTab = "home" | "lojas" | "config" | "features" | "vendas" | "logs" | "ativacoes" | "whatsapp" | "guia" | "indicacoes";

// ── Nav groups ──
interface NavGroup {
  label: string;
  items: { key: AdminTab; icon: React.ReactNode; label: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { key: "home", icon: <Home className="w-4 h-4" />, label: "Dashboard" },
      { key: "lojas", icon: <Store className="w-4 h-4" />, label: "Lojas" },
      { key: "indicacoes", icon: <Share2 className="w-4 h-4" />, label: "Indicações" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { key: "config", icon: <Settings className="w-4 h-4" />, label: "Configurações" },
      { key: "features", icon: <Sparkles className="w-4 h-4" />, label: "Funcionalidades" },
      { key: "vendas", icon: <MessageCircle className="w-4 h-4" />, label: "Chat de Vendas" },
      { key: "whatsapp", icon: <Smartphone className="w-4 h-4" />, label: "WhatsApp" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { key: "logs", icon: <AlertCircle className="w-4 h-4" />, label: "Logs de Erros" },
      { key: "ativacoes", icon: <ScrollText className="w-4 h-4" />, label: "Ativações" },
      { key: "guia", icon: <ScrollText className="w-4 h-4" />, label: "Guia" },
    ],
  },
];

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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
  const proCount = useMemo(() => orgs.filter((o) => o.subscription_plan === "pro").length, [orgs]);
  const enterpriseCount = useMemo(() => orgs.filter((o) => o.subscription_plan === "enterprise").length, [orgs]);
  const mrr = proCount * 99 + enterpriseCount * 249;

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

  // ── New stores this month vs last ──
  const { newThisMonth, newLastMonth } = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ntm = orgs.filter((o) => new Date(o.created_at) >= thisMonthStart).length;
    const nlm = orgs.filter((o) => {
      const d = new Date(o.created_at);
      return d >= lastMonthStart && d < thisMonthStart;
    }).length;
    return { newThisMonth: ntm, newLastMonth: nlm };
  }, [orgs]);

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

  function exportStoresCSV() {
    const header = "Nome,Slug,Endereço,Status,Plano,Itens,Criado em\n";
    const rows = filteredOrgs.map((o) =>
      `"${o.name}","${o.slug}","${o.store_address ?? ""}","${o.subscription_status}","${o.subscription_plan}",${o.menu_items_count},"${new Date(o.created_at).toLocaleDateString("pt-BR")}"`
    ).join("\n");
    downloadCSV(header + rows, "lojas.csv");
  }

  async function handlePlanChange(orgId: string, plan: string) {
    const { error } = await supabase
      .from("organizations")
      .update({ subscription_plan: plan })
      .eq("id", orgId);
    if (error) { toast.error("Erro ao atualizar plano"); return; }
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, subscription_plan: plan } : o));
    toast.success("Plano atualizado!");
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  // ── Greeting ──
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const todayFormatted = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Premium Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-[272px] transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
        style={{
          background: "linear-gradient(180deg, #0f0f0f 0%, #1a1208 50%, #0f0f0f 100%)",
        }}
      >
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src={logoIcon} alt="TrendFood" className="w-9 h-9 rounded-xl object-contain" />
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 group-hover:ring-primary/40 transition-all" />
            </div>
            <div>
              <span className="font-extrabold text-white text-[15px] tracking-tight block leading-tight">TrendFood</span>
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary/80">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Admin badge */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/[0.03] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
              <ShieldAlert className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white/90 text-xs truncate">Administrador</p>
              <p className="text-white/30 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Grouped Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20 px-3 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-left relative ${
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-white/45 hover:bg-white/[0.04] hover:text-white/70"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                      )}
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 pt-2 border-t border-white/[0.06] space-y-1">
          <Link
            to="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white/45 hover:bg-white/[0.04] hover:text-white/70 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Ir ao Dashboard
          </Link>
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white/45 hover:bg-white/[0.04] hover:text-white/70 transition-all"
          >
            <Globe className="w-4 h-4" />
            Ver o Site
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 border-b border-border"
          style={{ background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(24 20% 97%) 100%)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="" className="w-6 h-6 rounded-lg" />
              <span className="font-bold text-sm">TrendFood Admin</span>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {/* ── Home Tab ── */}
          {activeTab === "home" && (
            <div className="space-y-8">
              {/* Greeting header */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{greeting}, Admin 👋</h1>
                  <p className="text-sm text-muted-foreground capitalize mt-0.5">{todayFormatted}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard do Lojista
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* KPI cards - scrollable on mobile */}
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-6">
                <KpiCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Receita Estimada"
                  value={loading ? null : fmt(totalRevenue)}
                  iconBg="bg-emerald-500/10"
                  iconColor="text-emerald-600 dark:text-emerald-400"
                />
                <KpiCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="MRR"
                  value={loading ? null : fmt(mrr)}
                  iconBg="bg-blue-500/10"
                  iconColor="text-blue-600 dark:text-blue-400"
                />
                <KpiCard
                  icon={<CalendarPlus className="w-4 h-4" />}
                  label="A Receber (Mês)"
                  value={loading ? null : fmt(mrr)}
                  iconBg="bg-violet-500/10"
                  iconColor="text-violet-600 dark:text-violet-400"
                />
                <KpiCard
                  icon={<Store className="w-4 h-4" />}
                  label="Total Lojas"
                  value={loading ? null : orgs.length.toString()}
                  iconBg="bg-cyan-500/10"
                  iconColor="text-cyan-600 dark:text-cyan-400"
                  trend={newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : undefined}
                />
                <KpiCard
                  icon={<Users className="w-4 h-4" />}
                  label="Assinantes"
                  value={loading ? null : payingOrgs.length.toString()}
                  iconBg="bg-orange-500/10"
                  iconColor="text-orange-600 dark:text-orange-400"
                />
                <KpiCard
                  icon={<Sparkles className="w-4 h-4" />}
                  label="Trials"
                  value={loading ? null : trialCount.toString()}
                  iconBg="bg-amber-500/10"
                  iconColor="text-amber-600 dark:text-amber-400"
                />
              </div>

              {/* Quick actions */}
              {!loading && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveTab("lojas")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Store className="w-3.5 h-3.5" />
                    Ver Lojas
                  </button>
                  <button
                    onClick={() => setActiveTab("ativacoes")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    Ver Ativações
                  </button>
                  <button
                    onClick={() => setActiveTab("logs")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Logs de Erros
                  </button>
                  <button
                    onClick={() => setActiveTab("vendas")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat de Vendas
                  </button>
                </div>
              )}

              {!loading && <GrowthCharts orgs={orgs} />}

              {/* ── Subscriber details ── */}
              {!loading && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-4 h-4 text-primary/60" />
                    <h2 className="text-sm font-bold text-foreground">Detalhamento de Assinantes</h2>
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
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left px-5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Loja</th>
                              <th className="text-left px-5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Plano</th>
                              <th className="text-right px-5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Valor/mês</th>
                              <th className="text-right px-5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Meses</th>
                              <th className="text-right px-5 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Estimado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subscriberDetails.map((s) => (
                              <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg ${getAvatarColor(s.name)} flex items-center justify-center text-white text-xs font-bold`}>
                                      {s.emoji !== "🍽️" ? s.emoji : s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-foreground">{s.name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <Badge className={`text-[10px] px-2 py-0.5 rounded-full border-0 font-bold uppercase tracking-wider ${
                                    s.subscription_plan === "enterprise" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" : "bg-primary/15 text-primary"
                                  }`}>
                                    {s.subscription_plan}
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{fmt(s.planValue)}</td>
                                <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">{s.monthsActive}</td>
                                <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-foreground">{fmt(s.totalEstimated)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-primary/[0.03]">
                              <td colSpan={4} className="px-5 py-3 text-xs font-bold text-muted-foreground text-right uppercase tracking-wider">Total</td>
                              <td className="px-5 py-3 text-right font-bold tabular-nums text-foreground">{fmt(totalRevenue)}</td>
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
                <div>
                  <h2 className="text-lg font-bold text-foreground">Lojas da Plataforma</h2>
                  {!loading && (
                    <p className="text-sm text-muted-foreground mt-0.5">{orgs.length} lojas cadastradas</p>
                  )}
                </div>
                {!loading && filteredOrgs.length > 0 && (
                  <button
                    onClick={exportStoresCSV}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80"
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
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider shrink-0">Status:</span>
                      {(["all", "active", "trial"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setStatusFilter(v)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                            statusFilter === v
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {v === "all" ? "Todos" : v === "active" ? "Ativo" : "Trial"}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider shrink-0">Endereço:</span>
                      {(["all", "with", "without"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setAddressFilter(v)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                            addressFilter === v
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {v === "all" ? "Todos" : v === "with" ? "Com endereço" : "Sem endereço"}
                        </button>
                      ))}
                    </div>

                    <span className="ml-auto text-xs font-medium text-muted-foreground shrink-0">
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
                    <StoreCard key={org.id} org={org} onPlanChange={handlePlanChange} onDelete={(id, name) => setDeleteTarget({ id, name })} />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <PlansConfigSection />
              <TrialConfigSection />
              <PlatformConfigSection />
              <AdminDownloadsSection />
            </div>
          )}

          {activeTab === "features" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary/60" />
                <h2 className="text-sm font-bold text-foreground">Funcionalidades da Plataforma</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map((f) => (
                  <FeatureCard key={f.title} feature={f} />
                ))}
              </div>
            </section>
          )}

          {activeTab === "vendas" && <SalesChatTab />}
          {activeTab === "logs" && <ErrorLogsTab />}
          {activeTab === "ativacoes" && <ActivationLogsTab />}
          {activeTab === "whatsapp" && <WhatsAppConnectTab />}
          {activeTab === "indicacoes" && <ReferralsTab />}
          {activeTab === "guia" && <AdminGuideTab />}
        </main>

        {deleteTarget && (
          <DeleteUnitDialog
            open={!!deleteTarget}
            onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            orgId={deleteTarget.id}
            orgName={deleteTarget.name}
            onDeleted={async () => {
              setOrgs((prev) => prev.filter((o) => o.id !== deleteTarget.id));
              setDeleteTarget(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── KPI Card — compact with trend indicator ── */
function KpiCard({
  icon, label, value, iconBg, iconColor, trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  iconBg: string;
  iconColor: string;
  trend?: number;
}) {
  return (
    <div className="min-w-[140px] bg-card border border-border rounded-2xl p-4 flex flex-col gap-2.5 hover:shadow-md hover:border-border/80 transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-0.5 text-[11px] font-bold ${trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {value === null ? (
        <Skeleton className="h-6 w-14" />
      ) : (
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      )}
      <p className="text-[11px] text-muted-foreground leading-snug font-medium">{label}</p>
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
      <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
        <span>Setup</span>
        <span className={pct === 100 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>{pct}%</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
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

/* ── Store Card — refined ── */
function StoreCard({ org, onPlanChange, onDelete }: { org: OrgRow; onPlanChange: (id: string, plan: string) => void; onDelete: (id: string, name: string) => void }) {
  const { user } = useAuth();
  const [localOrg, setLocalOrg] = useState(org);
  const [activating, setActivating] = useState(false);
  const avatarColor = getAvatarColor(org.name);
  const initial = org.name.charAt(0).toUpperCase();
  const isActive = localOrg.subscription_status === "active";

  async function quickActivate() {
    setActivating(true);
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);

      const { error } = await supabase.from("organizations").update({
        subscription_plan: "pro",
        subscription_status: "active",
        trial_ends_at: trialEnd.toISOString(),
      }).eq("id", org.id);

      if (error) throw error;

      await supabase.from("activation_logs").insert({
        organization_id: org.id,
        org_name: org.name,
        old_plan: localOrg.subscription_plan,
        new_plan: "pro",
        old_status: localOrg.subscription_status,
        new_status: "active",
        source: "manual",
        admin_email: user?.email ?? null,
        notes: "Ativação rápida 30d",
      });

      await processReferralBonusClient(org.id, org.name);

      setLocalOrg((prev) => ({
        ...prev,
        subscription_plan: "pro",
        subscription_status: "active",
        trial_ends_at: trialEnd.toISOString(),
      }));
      onPlanChange(org.id, "pro");
      toast.success(`${org.name} ativada como Pro por 30 dias!`);
    } catch {
      toast.error("Erro ao ativar");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-border/80 transition-all duration-200 flex flex-col group">
      <div className="p-5 flex items-start gap-3 flex-1">
        <div
          className={`w-10 h-10 rounded-xl ${avatarColor} flex items-center justify-center text-white font-bold text-base shrink-0 group-hover:scale-105 transition-transform`}
        >
          {org.emoji !== "🍽️" ? org.emoji : initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{org.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                /unidade/{org.slug}
              </p>
            </div>
            <a
              href={`/unidade/${org.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/10"
              title="Abrir loja"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge
              className={`text-[10px] px-2 py-0.5 rounded-full border-0 font-bold ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {isActive ? "Ativo" : "Trial"}
            </Badge>
            {org.store_address ? (
              <Badge className="text-[10px] px-2 py-0.5 rounded-full border-0 font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Endereço
              </Badge>
            ) : (
              <Badge className="text-[10px] px-2 py-0.5 rounded-full border-0 font-medium bg-muted text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                Sem end.
              </Badge>
            )}
            <Badge className={`text-[10px] px-2 py-0.5 rounded-full border-0 font-bold uppercase tracking-wider ${
              localOrg.subscription_plan === "lifetime" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
              localOrg.subscription_plan === "enterprise" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" :
              localOrg.subscription_plan === "pro" ? "bg-primary/15 text-primary" :
              "bg-muted text-muted-foreground"
            }`}>
              {localOrg.subscription_plan === "lifetime" ? "Vitalício" : localOrg.subscription_plan}
            </Badge>
          </div>
        </div>
      </div>

      <SetupScore org={org} />

      <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={quickActivate}
            disabled={activating || localOrg.subscription_plan === "pro"}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {activating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Ativar 30d
          </button>
          <ManageSubscriptionDialog
            org={localOrg}
            onSaved={(updated) => {
              setLocalOrg((prev) => ({ ...prev, ...updated }));
              onPlanChange(org.id, updated.subscription_plan);
            }}
          />
        </div>
        {localOrg.trial_ends_at && (
          <span className="text-[10px] text-muted-foreground">
            até {new Date(localOrg.trial_ends_at).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      <div className="border-t border-border/50 px-5 py-2.5 flex items-center justify-between bg-muted/20">
        <span className="text-[10px] text-muted-foreground">
          Desde {new Date(org.created_at).toLocaleDateString("pt-BR")}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDelete(org.id, org.name)}
            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Excluir loja"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <Link
            to={`/unidade/${org.slug}`}
            className="text-[11px] text-primary hover:underline font-medium"
          >
            Ver loja →
          </Link>
        </div>
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
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-border/80 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {feature.icon}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${planBadge.className}`}>
            {planBadge.label}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${className}`}>
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
