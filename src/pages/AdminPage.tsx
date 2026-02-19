import { useState, useEffect, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import GrowthCharts from "@/components/admin/GrowthCharts";
import RecentOrdersFeed from "@/components/admin/RecentOrdersFeed";
import PlatformConfigSection from "@/components/admin/PlatformConfigSection";
import {
  Store,
  ShieldAlert,
  TrendingUp,
  ShoppingBag,
  MapPin,
  ExternalLink,
  Loader2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  MessageCircle,
  Printer,
  Sparkles,
  DollarSign,
  FileText,
  ArrowRight,
  Download,
  Crown,
  CalendarPlus,
} from "lucide-react";

// ── Report types ──
interface ReportRow {
  org: OrgRow;
  totalOrders: number;
  paidOrders: number;
  revenue: number;
  avgTicket: number;
  topItems: { name: string; qty: number }[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

function generatePdf(row: ReportRow, monthLabel: string) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Mensal – ${row.org.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 40px; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 32px; }
    .brand { font-size: 22px; font-weight: 800; color: #f97316; letter-spacing: -0.5px; }
    .store { text-align: right; }
    .store-name { font-size: 18px; font-weight: 700; }
    .store-month { font-size: 13px; color: #666; margin-top: 2px; }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; }
    .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 8px; }
    .card-value { font-size: 22px; font-weight: 800; color: #111; }
    .card-value.revenue { color: #16a34a; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 12px; color: #888; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    td { font-size: 13px; padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    tr:last-child td { border-bottom: none; }
    .rank { width: 32px; height: 32px; border-radius: 50%; background: #f97316; color: #fff; font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
    .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
    .no-data { text-align: center; color: #aaa; font-size: 13px; padding: 24px 0; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">TrendFood</div>
    <div class="store">
      <div class="store-name">${row.org.emoji} ${row.org.name}</div>
      <div class="store-month">Relatório de ${monthLabel}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-label">Faturamento</div>
      <div class="card-value revenue">${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(row.revenue)}</div>
    </div>
    <div class="card">
      <div class="card-label">Pedidos Pagos</div>
      <div class="card-value">${row.paidOrders}</div>
    </div>
    <div class="card">
      <div class="card-label">Ticket Médio</div>
      <div class="card-value">${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(row.avgTicket)}</div>
    </div>
  </div>

  <div class="section-title">Top 5 Itens Mais Vendidos</div>
  ${row.topItems.length === 0
    ? `<div class="no-data">Nenhum item registrado neste período.</div>`
    : `<table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Quantidade</th>
      </tr>
    </thead>
    <tbody>
      ${row.topItems.map((item, i) => `
      <tr>
        <td><span class="rank">${i + 1}</span></td>
        <td>${item.name}</td>
        <td><strong>${item.qty}</strong></td>
      </tr>`).join("")}
    </tbody>
  </table>`}

  <div class="footer">
    <span>trendfood.com.br</span>
    <span>Gerado em ${new Date().toLocaleString("pt-BR")}</span>
  </div>

`;
  const scriptTag = `<script>window.onload = () => window.print();</` + `script>`;
  const fullHtml = html + scriptTag + `\n</body>\n</html>`;

  win.document.write(fullHtml);
  win.document.close();
}

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
  orders_count: number;
  total_revenue: number;
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
  actionLabel?: string;
  actionHref?: string;
}

const FEATURES: Feature[] = [
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "Suporte via WhatsApp",
    description: "Atendimento direto pelo WhatsApp para tirar dúvidas e resolver problemas em tempo real.",
    status: "available",
    actionLabel: "Abrir suporte",
    actionHref: "https://wa.me/5511999999999?text=Olá%2C%20preciso%20de%20suporte%20com%20o%20TrendFood",
  },
  {
    icon: <Printer className="w-5 h-5" />,
    title: "Impressora Térmica",
    description: "Impressão automática de pedidos em impressoras térmicas 80mm com QR Code PIX.",
    status: "beta",
    actionLabel: "Ver documentação",
    actionHref: "/docs/impressora-termica",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Onboarding Guiado",
    description: "Wizard passo a passo para novas lojas configurarem nome, endereço, horários e primeiro item do cardápio.",
    status: "available",
    actionLabel: "Ver no dashboard",
    actionHref: "/dashboard",
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: "Controle de Caixa",
    description: "Abertura e fechamento de caixa com saldo inicial, sangrias e relatório do turno.",
    status: "available",
    actionLabel: "Ver no dashboard",
    actionHref: "/dashboard",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Relatório PDF Mensal",
    description: "Gere relatórios mensais por loja com faturamento, pedidos e ticket médio diretamente no painel admin.",
    status: "available",
    actionLabel: "Ver relatório",
    actionHref: "/admin",
  },
];

const STATUS_CONFIG: Record<FeatureStatus, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  beta: { label: "Beta", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  soon: { label: "Em breve", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { label: "Planejado", className: "bg-muted text-muted-foreground" },
};

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

const MONTH_OPTIONS = generateMonthOptions();

function AdminContent() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "trial">("all");
  const [addressFilter, setAddressFilter] = useState<"all" | "with" | "without">("all");

  // ── Report state ──
  const [reportMonth, setReportMonth] = useState(() => MONTH_OPTIONS[0].value);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [rawOrders, setRawOrders] = useState<{ created_at: string }[]>([]);
  useEffect(() => {
    async function load() {
      const [{ data: orgsData }, { data: menuData }, { data: ordersData }, { data: orderItemsData }] =
        await Promise.all([
          supabase
            .from("organizations")
            .select("id, name, slug, store_address, created_at, subscription_status, subscription_plan, trial_ends_at, emoji, whatsapp, business_hours")
            .order("created_at", { ascending: false }),
          supabase.from("menu_items").select("organization_id"),
          supabase.from("orders").select("id, organization_id, created_at"),
          supabase.from("order_items").select("order_id, price, quantity"),
        ]);

      if (!orgsData) { setLoading(false); return; }

      const menuCount: Record<string, number> = {};
      (menuData ?? []).forEach((m) => {
        menuCount[m.organization_id] = (menuCount[m.organization_id] ?? 0) + 1;
      });

      const ordersByOrg: Record<string, string[]> = {};
      (ordersData ?? []).forEach((o) => {
        if (!ordersByOrg[o.organization_id]) ordersByOrg[o.organization_id] = [];
        ordersByOrg[o.organization_id].push(o.id);
      });

      const revenueByOrder: Record<string, number> = {};
      (orderItemsData ?? []).forEach((oi) => {
        revenueByOrder[oi.order_id] = (revenueByOrder[oi.order_id] ?? 0) + oi.price * oi.quantity;
      });

      const enriched: OrgRow[] = orgsData.map((org) => {
        const orderIds = ordersByOrg[org.id] ?? [];
        const revenue = orderIds.reduce((sum, oid) => sum + (revenueByOrder[oid] ?? 0), 0);
        return {
          ...org,
          subscription_plan: org.subscription_plan ?? "free",
          trial_ends_at: org.trial_ends_at ?? null,
          menu_items_count: menuCount[org.id] ?? 0,
          orders_count: orderIds.length,
          total_revenue: revenue,
          whatsapp: org.whatsapp ?? null,
          business_hours: org.business_hours as object | null,
        };
      });

      setOrgs(enriched);
      setRawOrders((ordersData ?? []).map((o) => ({ created_at: o.created_at })));
      setLoading(false);
    }
    load();
  }, []);

  // ── Load report data when month or orgs change ──
  useEffect(() => {
    if (orgs.length === 0) return;
    async function loadReport() {
      setLoadingReport(true);
      const [year, month] = reportMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 1).toISOString();

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, organization_id, status, paid, order_items(name, price, quantity)")
        .gte("created_at", start)
        .lt("created_at", end);

      const rows: ReportRow[] = orgs.map((org) => {
        const orgOrders = (ordersData ?? []).filter((o) => o.organization_id === org.id);
        const totalOrders = orgOrders.filter((o) => o.status === "delivered").length;
        const paidOrders = orgOrders.filter((o) => o.paid).length;

        const paidOrderItems = orgOrders
          .filter((o) => o.paid)
          .flatMap((o) => (o.order_items as { name: string; price: number; quantity: number }[]));

        const revenue = paidOrderItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const avgTicket = paidOrders > 0 ? revenue / paidOrders : 0;

        // Aggregate top items
        const itemMap: Record<string, number> = {};
        paidOrderItems.forEach((i) => {
          itemMap[i.name] = (itemMap[i.name] ?? 0) + i.quantity;
        });
        const topItems = Object.entries(itemMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty }));

        return { org, totalOrders, paidOrders, revenue, avgTicket, topItems };
      });

      setReportData(rows);
      setLoadingReport(false);
    }
    loadReport();
  }, [reportMonth, orgs]);

  // KPIs (always from full orgs)
  const totalOrders = orgs.reduce((s, o) => s + o.orders_count, 0);
  const totalRevenue = orgs.reduce((s, o) => s + o.total_revenue, 0);
  const withAddress = orgs.filter((o) => o.store_address).length;

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

  // ── Org map for feed ──
  const orgMap = useMemo(() => {
    const map: Record<string, { name: string; emoji: string }> = {};
    orgs.forEach((o) => { map[o.id] = { name: o.name, emoji: o.emoji }; });
    return map;
  }, [orgs]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setAddressFilter("all");
  }

  // ── CSV Export ──
  function exportStoresCSV() {
    const header = "Nome,Slug,Endereço,Status,Plano,Itens,Pedidos,Receita,Criado em\n";
    const rows = filteredOrgs.map((o) =>
      `"${o.name}","${o.slug}","${o.store_address ?? ""}","${o.subscription_status}","${o.subscription_plan}",${o.menu_items_count},${o.orders_count},${o.total_revenue.toFixed(2)},"${new Date(o.created_at).toLocaleDateString("pt-BR")}"`
    ).join("\n");
    downloadCSV(header + rows, "lojas.csv");
  }

  function exportReportCSV() {
    const monthLabel = MONTH_OPTIONS.find((o) => o.value === reportMonth)?.label ?? reportMonth;
    const header = "Loja,Faturamento,Pedidos Pagos,Ticket Médio,Top Item\n";
    const rows = reportData.map((r) =>
      `"${r.org.name}",${r.revenue.toFixed(2)},${r.paidOrders},${r.avgTicket.toFixed(2)},"${r.topItems[0]?.name ?? "-"}"`
    ).join("\n");
    downloadCSV(header + rows, `relatorio-${monthLabel.replace(" ", "-")}.csv`);
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Header ── */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">TrendFood</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/5511999999999?text=Olá%2C%20preciso%20de%20suporte%20com%20o%20TrendFood"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:block">Suporte</span>
            </a>
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[180px]">
              {user?.email}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Store className="w-5 h-5" />}
            label="Lojas Cadastradas"
            value={loading ? null : orgs.length.toString()}
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-500/10"
          />
          <KpiCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Pedidos na Plataforma"
            value={loading ? null : totalOrders.toString()}
            color="text-violet-600 dark:text-violet-400"
            bg="bg-violet-500/10"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Faturamento Total"
            value={loading ? null : fmt(totalRevenue)}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-500/10"
          />
          <KpiCard
            icon={<MapPin className="w-5 h-5" />}
            label="Lojas Configuradas"
            value={loading ? null : `${withAddress} de ${orgs.length}`}
            color="text-orange-600 dark:text-orange-400"
            bg="bg-orange-500/10"
          />
        </div>

        {/* ── Growth Charts ── */}
        {!loading && <GrowthCharts orgs={orgs} orders={rawOrders} />}

        {/* ── Recent Orders Feed ── */}
        {!loading && <RecentOrdersFeed orgMap={orgMap} />}

        {/* ── Stores Grid ── */}
        <section>
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
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

          {/* ── Filter bar ── */}
          {!loading && orgs.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 mb-5 space-y-3">
              {/* Search */}
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

              {/* Pills row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {/* Status filter */}
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

                {/* Address filter */}
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

                {/* Counter */}
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

        {/* ── Monthly Report ── */}
        <section id="relatorio-mensal">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Relatório Mensal por Loja
            </h2>
            <div className="flex items-center gap-3">
              {!loadingReport && reportData.length > 0 && (
                <button
                  onClick={exportReportCSV}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </button>
              )}
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading || loadingReport ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Nenhuma loja cadastrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.map((row) => {
                const monthLabel = MONTH_OPTIONS.find((o) => o.value === reportMonth)?.label ?? reportMonth;
                return (
                  <div key={row.org.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
                    {/* Store header */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${getAvatarColor(row.org.name)} flex items-center justify-center text-white font-bold text-base shrink-0`}>
                        {row.org.emoji !== "🍽️" ? row.org.emoji : row.org.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{row.org.name}</p>
                        <p className="text-xs text-muted-foreground">{monthLabel}</p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{fmt(row.revenue)}</p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
                        <p className="text-sm font-bold text-foreground leading-tight">{row.paidOrders}</p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
                        <p className="text-sm font-bold text-foreground leading-tight">{fmt(row.avgTicket)}</p>
                      </div>
                    </div>

                    {/* Generate PDF button */}
                    <button
                      onClick={() => generatePdf(row, monthLabel)}
                      className="mt-auto flex items-center justify-center gap-2 w-full text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-xl py-2.5 px-4"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Gerar PDF
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Platform Config ── */}
        <PlatformConfigSection />

        {/* ── Feature Roadmap ── */}
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
      </main>
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
      {/* Card top */}
      <div className="p-5 flex items-start gap-3 flex-1">
        {/* Avatar */}
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

          {/* Badges */}
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
          </div>
        </div>
      </div>

      {/* Setup Score */}
      <SetupScore org={org} />

      {/* Divider */}
      <div className="border-t border-border mx-5" />

      {/* Metrics */}
      <div className="grid grid-cols-3 divide-x divide-border">
        <Metric label="Itens" value={org.menu_items_count.toString()} />
        <Metric label="Pedidos" value={org.orders_count.toString()} />
        <Metric label="Receita" value={fmt(org.total_revenue)} small />
      </div>

      {/* Plan Management */}
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

      {/* Footer */}
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

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="py-3 px-4 flex flex-col items-center gap-0.5">
      <p className={`font-bold text-foreground ${small ? "text-xs" : "text-sm"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Feature Card ── */
function FeatureCard({ feature }: { feature: Feature }) {
  const { label, className } = STATUS_CONFIG[feature.status];
  const isActionable = feature.status === "available" || feature.status === "beta";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {feature.icon}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${className}`}>
          {label}
        </span>
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
