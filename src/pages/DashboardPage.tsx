import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home, LayoutList, Store, Settings, LogOut, ExternalLink,
  ChefHat, Menu, UtensilsCrossed
} from "lucide-react";
import HomeTab from "@/components/dashboard/HomeTab";
import MuralTab from "@/components/dashboard/MuralTab";
import MenuTab from "@/components/dashboard/MenuTab";
import StoreProfileTab from "@/components/dashboard/StoreProfileTab";
import SettingsTab from "@/components/dashboard/SettingsTab";

type TabKey = "home" | "menu" | "mural" | "profile" | "settings";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, organization, loading, signOut, refreshOrganizationForUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const retryRef = useRef(false);

  // Redirect if not authenticated (inside useEffect to avoid render-phase side-effects)
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  // Fallback: if user is authenticated but org is null (race condition from signup),
  // retry fetching the organization once automatically
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

  if (!organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🏪</p>
          <h1 className="font-bold text-foreground text-xl mb-2">Nenhuma lanchonete encontrada</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Parece que sua conta ainda não tem uma lanchonete associada.
          </p>
          <Button onClick={signOut} variant="outline">Sair</Button>
        </div>
      </div>
    );
  }

  const navItems: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: "home", icon: <Home className="w-4 h-4" />, label: "Home" },
    { key: "menu", icon: <UtensilsCrossed className="w-4 h-4" />, label: "Meu Cardápio" },
    { key: "mural", icon: <LayoutList className="w-4 h-4" />, label: "Gerenciar Mural" },
    { key: "profile", icon: <Store className="w-4 h-4" />, label: "Perfil da Loja" },
    { key: "settings", icon: <Settings className="w-4 h-4" />, label: "Configurações" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 bg-card border-r border-border flex flex-col
          w-64 transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-foreground text-base">TrendFood</span>
          </Link>
        </div>

        {/* Org info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                {organization.emoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{organization.name}</p>
              <p className="text-muted-foreground text-xs truncate">/unidade/{organization.slug}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-border space-y-1">
          <a
            href={`/unidade/${organization.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver página pública
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
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
          {activeTab === "home" && <HomeTab organization={organization} />}
          {activeTab === "menu" && <MenuTab organization={organization} />}
          {activeTab === "mural" && <MuralTab organization={organization} />}
          {activeTab === "profile" && <StoreProfileTab organization={organization} />}
          {activeTab === "settings" && <SettingsTab />}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
