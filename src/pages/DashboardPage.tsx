import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home, Store, Settings, LogOut, ExternalLink,
  ChefHat, Menu, UtensilsCrossed, TableProperties, Flame, BellRing, Zap, Download
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
import HomeTab from "@/components/dashboard/HomeTab";
import MenuTab from "@/components/dashboard/MenuTab";
import TablesTab from "@/components/dashboard/TablesTab";
import StoreProfileTab from "@/components/dashboard/StoreProfileTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import KitchenTab from "@/components/dashboard/KitchenTab";
import WaiterTab from "@/components/dashboard/WaiterTab";

type TabKey = "home" | "menu" | "tables" | "kitchen" | "waiter" | "profile" | "settings";

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization, loading, signOut, refreshOrganizationForUser } = useAuth();
  const initialTab = (location.state as { tab?: string })?.tab === "tables" ? "tables" : "home";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const retryRef = useRef(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setAppInstalled(true));
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && !organization && !retryRef.current) {
      retryRef.current = true;
      refreshOrganizationForUser(user.id);
    }
  }, [loading, user, organization, refreshOrganizationForUser]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  const subscriptionStatus = (organization as { subscription_status?: string }).subscription_status ?? "trial";

  if (subscriptionStatus === "inactive") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="font-bold text-foreground text-xl mb-2">Sua assinatura está inativa</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Para continuar usando o painel, ative seu plano. Entre em contato conosco.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="https://wa.me/5511999999999?text=Quero+reativar+minha+assinatura+TrendFood"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: "#25D366" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.940 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar no WhatsApp
            </a>
            <Button onClick={signOut} variant="outline">Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  const navItemsTop: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: "home", icon: <Home className="w-4 h-4" />, label: "Home" },
    { key: "menu", icon: <UtensilsCrossed className="w-4 h-4" />, label: "Meu Cardápio" },
    { key: "tables", icon: <TableProperties className="w-4 h-4" />, label: "Mesas" },
  ];

  const navItemsOps: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: "kitchen", icon: <Flame className="w-4 h-4" />, label: "Cozinha (KDS)" },
    { key: "waiter", icon: <BellRing className="w-4 h-4" />, label: "Painel do Garçom" },
  ];

  const navItemsBottom: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: "profile", icon: <Store className="w-4 h-4" />, label: "Perfil da Loja" },
    { key: "settings", icon: <Settings className="w-4 h-4" />, label: "Configurações" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    (installPrompt as BeforeInstallPromptEvent).prompt();
    const { outcome } = await (installPrompt as BeforeInstallPromptEvent).userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  // Sidebar nav button style helper
  const navBtnClass = (key: TabKey) =>
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

      {/* ── Sidebar ──────────────────────────────────────────────── */}
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
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white text-base tracking-tight">TrendFood</span>
          </Link>
        </div>

        {/* Org info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
            {organization.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/20" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-lg border border-primary/30">
                {organization.emoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{organization.name}</p>
              <p className="text-white/40 text-xs truncate">/{organization.slug}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItemsTop.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={navBtnClass(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {/* Operações separator */}
          <div className="pt-5 pb-2 px-3">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Operações</p>
          </div>

          {navItemsOps.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={navBtnClass(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {/* Divider */}
          <div className="pt-4 pb-1">
            <div className="border-t border-white/10" />
          </div>

          {navItemsBottom.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={navBtnClass(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-0.5">
          {installPrompt && !appInstalled && (
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/15 transition-all duration-150"
            >
              <Download className="w-4 h-4" />
              Instalar App
            </button>
          )}
          <a
            href={`https://trendfood.lovable.app/unidade/${organization.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all duration-150"
          >
            <ExternalLink className="w-4 h-4" />
            Ver página pública
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/10 hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
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
            <span className="text-xl">{organization.emoji}</span>
            <span className="font-bold text-sm">{organization.name}</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Trial banner — redesigned */}
          {subscriptionStatus === "trial" && (
            <div className="mb-5 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 to-amber-500/8 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm">Período de teste ativo</p>
                <p className="text-muted-foreground text-xs">Ative seu plano para acesso contínuo ao painel.</p>
              </div>
              <a
                href="https://wa.me/5511999999999?text=Quero+ativar+meu+plano+TrendFood"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Ativar plano
              </a>
            </div>
          )}

          {activeTab === "home" && <HomeTab organization={organization} />}
          {activeTab === "menu" && <MenuTab organization={organization} />}
          {activeTab === "tables" && <TablesTab organization={organization} />}
          {activeTab === "kitchen" && <KitchenTab orgId={organization.id} />}
          {activeTab === "waiter" && <WaiterTab orgId={organization.id} whatsapp={organization.whatsapp} />}
          {activeTab === "profile" && <StoreProfileTab organization={organization} />}
          {activeTab === "settings" && <SettingsTab />}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
