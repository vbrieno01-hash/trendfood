import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  emoji: string;
  menu_items_count: number;
  orders_count: number;
  total_revenue: number;
}

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
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch orgs + menu items count + orders aggregates in parallel
      const [{ data: orgsData }, { data: menuData }, { data: ordersData }, { data: orderItemsData }] =
        await Promise.all([
          supabase
            .from("organizations")
            .select("id, name, slug, store_address, created_at, subscription_status, emoji")
            .order("created_at", { ascending: false }),
          supabase.from("menu_items").select("organization_id"),
          supabase.from("orders").select("id, organization_id"),
          supabase.from("order_items").select("order_id, price, quantity"),
        ]);

      if (!orgsData) { setLoading(false); return; }

      // Build lookup maps
      const menuCount: Record<string, number> = {};
      (menuData ?? []).forEach((m) => {
        menuCount[m.organization_id] = (menuCount[m.organization_id] ?? 0) + 1;
      });

      const ordersByOrg: Record<string, string[]> = {};
      (ordersData ?? []).forEach((o) => {
        if (!ordersByOrg[o.organization_id]) ordersByOrg[o.organization_id] = [];
        ordersByOrg[o.organization_id].push(o.id);
      });

      // order_id -> revenue
      const revenueByOrder: Record<string, number> = {};
      (orderItemsData ?? []).forEach((oi) => {
        revenueByOrder[oi.order_id] = (revenueByOrder[oi.order_id] ?? 0) + oi.price * oi.quantity;
      });

      const enriched: OrgRow[] = orgsData.map((org) => {
        const orderIds = ordersByOrg[org.id] ?? [];
        const revenue = orderIds.reduce((sum, oid) => sum + (revenueByOrder[oid] ?? 0), 0);
        return {
          ...org,
          menu_items_count: menuCount[org.id] ?? 0,
          orders_count: orderIds.length,
          total_revenue: revenue,
        };
      });

      setOrgs(enriched);
      setLoading(false);
    }
    load();
  }, []);

  // KPIs
  const totalOrders = orgs.reduce((s, o) => s + o.orders_count, 0);
  const totalRevenue = orgs.reduce((s, o) => s + o.total_revenue, 0);
  const withAddress = orgs.filter((o) => o.store_address).length;

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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[180px]">
              {user?.email}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

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

        {/* ── Stores Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Lojas da Plataforma
            </h2>
            {!loading && (
              <span className="text-xs text-muted-foreground">{orgs.length} lojas</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              Nenhuma loja cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgs.map((org) => (
                <StoreCard key={org.id} org={org} />
              ))}
            </div>
          )}
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

/* ── Store Card ── */
function StoreCard({ org }: { org: OrgRow }) {
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

      {/* Divider */}
      <div className="border-t border-border mx-5" />

      {/* Metrics */}
      <div className="grid grid-cols-3 divide-x divide-border">
        <Metric label="Itens" value={org.menu_items_count.toString()} />
        <Metric label="Pedidos" value={org.orders_count.toString()} />
        <Metric label="Receita" value={fmt(org.total_revenue)} small />
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
