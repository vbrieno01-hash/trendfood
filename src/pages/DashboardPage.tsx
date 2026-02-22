import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import OrgSwitcher from "@/components/dashboard/OrgSwitcher";
import CreateUnitDialog from "@/components/dashboard/CreateUnitDialog";
import DeleteUnitDialog from "@/components/dashboard/DeleteUnitDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home, Store, Settings, LogOut, ExternalLink,
  Menu, UtensilsCrossed, TableProperties, Flame, BellRing, Download,
  History, Tag, BarChart2, Wallet, Lock, Rocket, AlertTriangle, Zap,
  BookOpen, Sparkles, FileBarChart, Share2, Printer, Bike,
} from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradePrompt from "@/components/dashboard/UpgradePrompt";
import logoIcon from "@/assets/logo-icon.png";
import { requestBluetoothPrinter, disconnectPrinter, isBluetoothSupported } from "@/lib/bluetoothPrinter";

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
import HistoryTab from "@/components/dashboard/HistoryTab";
import CouponsTab from "@/components/dashboard/CouponsTab";
import BestSellersTab from "@/components/dashboard/BestSellersTab";
import CaixaTab from "@/components/dashboard/CaixaTab";
import FeaturesTab from "@/components/dashboard/FeaturesTab";
import GuideTab from "@/components/dashboard/GuideTab";
import ReportsTab from "@/components/dashboard/ReportsTab";
import CourierDashboardTab from "@/components/dashboard/CourierDashboardTab";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";

type TabKey = "home" | "menu" | "tables" | "kitchen" | "waiter" | "profile" | "settings" | "history" | "coupons" | "bestsellers" | "caixa" | "features" | "guide" | "reports" | "courier";

const DashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization, organizations, isAdmin, loading, signOut, refreshOrganizationForUser, refreshOrganization, switchOrganization } = useAuth();
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [deleteUnit, setDeleteUnit] = useState<{ id: string; name: string } | null>(null);
  const planLimits = usePlanLimits(organization);
  // Read tab from URL query param, fallback to location.state, then "home"
  const getInitialTab = (): TabKey => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab") as TabKey | null;
    const tabFromState = (location.state as { tab?: string })?.tab as TabKey | null;
    return tabFromUrl || tabFromState || "home";
  };
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const retryRef = useRef(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [appInstalled, setAppInstalled] = useState(false);

  // Bluetooth state lifted from SettingsTab
  const [btDevice, setBtDevice] = useState<BluetoothDevice | null>(null);
  const [btConnected, setBtConnected] = useState(false);
  const btSupported = isBluetoothSupported();

  const handlePairBluetooth = async () => {
    const device = await requestBluetoothPrinter();
    if (device) {
      setBtDevice(device);
      setBtConnected(true);
      toast.success(`Impressora "${device.name || "Bluetooth"}" pareada!`);
      device.addEventListener("gattserverdisconnected", () => {
        setBtConnected(false);
      });
    }
  };

  const handleDisconnectBluetooth = () => {
    if (btDevice) {
      disconnectPrinter(btDevice);
      setBtDevice(null);
      setBtConnected(false);
      toast.info("Impressora desconectada.");
    }
  };

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
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && !organization && !retryRef.current) {
      retryRef.current = true;
      refreshOrganizationForUser(user.id);
    }
  }, [loading, user, organization, refreshOrganizationForUser]);

  // Listen to popstate (browser back/forward) to update active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab") as TabKey | null;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  // Post-checkout feedback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
      toast.success("Assinatura ativada com sucesso! Bem-vindo ao plano Pro 🎉");
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.functions.invoke("check-subscription", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).then(() => refreshOrganization());
        }
      });
      navigate("/dashboard", { replace: true });
    }
  }, [location.search, navigate, refreshOrganization]);

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
          <h1 className="font-bold text-xl mb-2">Nenhuma loja vinculada</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {isAdmin
              ? "Você está logado como administrador da plataforma."
              : "Sua conta ainda não tem uma loja configurada."}
          </p>
          <div className="flex gap-2 justify-center">
            {isAdmin && (
              <Button asChild>
                <Link to="/admin">Acessar Painel Admin</Link>
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  const subscriptionStatus = (organization as { subscription_status?: string }).subscription_status ?? "active";

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

  const lockedFeatures: Record<string, boolean> = {
    coupons: !planLimits.canAccess("cupons"),
    bestsellers: !planLimits.canAccess("bestsellers"),
    kitchen: !planLimits.canAccess("kds"),
    waiter: !planLimits.canAccess("waiter"),
    caixa: !planLimits.canAccess("caixa"),
    reports: !planLimits.canAccess("reports"),
  };

  const navItemsTop: { key: TabKey; icon: React.ReactNode; label: string; locked?: boolean }[] = [
    { key: "home", icon: <Home className="w-4 h-4" />, label: "Home" },
    { key: "menu", icon: <UtensilsCrossed className="w-4 h-4" />, label: "Meu Cardápio" },
    { key: "tables", icon: <TableProperties className="w-4 h-4" />, label: "Mesas" },
    { key: "history", icon: <History className="w-4 h-4" />, label: "Histórico" },
    { key: "coupons", icon: <Tag className="w-4 h-4" />, label: "Cupons", locked: lockedFeatures.coupons },
    { key: "bestsellers", icon: <BarChart2 className="w-4 h-4" />, label: "Mais Vendidos", locked: lockedFeatures.bestsellers },
    { key: "reports", icon: <FileBarChart className="w-4 h-4" />, label: "Relatórios", locked: lockedFeatures.reports },
  ];

  const navItemsOps: { key: TabKey; icon: React.ReactNode; label: string; locked?: boolean }[] = [
    { key: "kitchen", icon: <Flame className="w-4 h-4" />, label: "Cozinha (KDS)", locked: lockedFeatures.kitchen },
    { key: "waiter", icon: <BellRing className="w-4 h-4" />, label: "Painel do Garçom", locked: lockedFeatures.waiter },
    { key: "caixa", icon: <Wallet className="w-4 h-4" />, label: "Caixa", locked: lockedFeatures.caixa },
    { key: "courier", icon: <Bike className="w-4 h-4" />, label: "Motoboys" },
  ];

  const navItemsBottom: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: "features", icon: <Sparkles className="w-4 h-4" />, label: "Funcionalidades" },
    { key: "guide", icon: <BookOpen className="w-4 h-4" />, label: "Como Usar" },
    { key: "profile", icon: <Store className="w-4 h-4" />, label: "Perfil da Loja" },
    { key: "settings", icon: <Settings className="w-4 h-4" />, label: "Configurações" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  // Sync tabs with URL
  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    navigate(`/dashboard?tab=${key}`, { replace: false });
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

  const showOnboarding = organization && !(organization as any).onboarding_done;

  return (
    <div className="min-h-screen bg-background flex w-full">
      {showOnboarding && (
        <OnboardingWizard
          organization={organization}
          onComplete={async () => { await refreshOrganization(); }}
        />
      )}
      {user && (
        <>
          <CreateUnitDialog
            open={createUnitOpen}
            onOpenChange={setCreateUnitOpen}
            userId={user.id}
            parentPlan={organization?.subscription_plan ?? "free"}
            onCreated={async () => {
              await refreshOrganization();
            }}
          />
          {deleteUnit && (
            <DeleteUnitDialog
              open={!!deleteUnit}
              onOpenChange={(open) => { if (!open) setDeleteUnit(null); }}
              orgId={deleteUnit.id}
              orgName={deleteUnit.name}
              onDeleted={async () => {
                setDeleteUnit(null);
                await refreshOrganization();
              }}
            />
          )}
        </>
      )}
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
            <img src={logoIcon} alt="TrendFood" className="w-8 h-8 rounded-xl object-contain shadow-lg shadow-primary/30" />
            <span className="font-extrabold text-white text-base tracking-tight">TrendFood</span>
          </Link>
        </div>

        {/* Org switcher */}
        <div className="px-4 py-4 border-b border-white/10">
          <OrgSwitcher
            organizations={organizations}
            activeOrg={organization}
            onSwitch={(orgId) => {
              switchOrganization(orgId);
              handleTabChange("home");
            }}
            onCreateNew={() => setCreateUnitOpen(true)}
            canCreateNew={planLimits.canAccess("multi_unit")}
            onDelete={(orgId) => {
              const org = organizations.find((o) => o.id === orgId);
              if (org) setDeleteUnit({ id: org.id, name: org.name });
            }}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItemsTop.map((item) => (
            <button
              key={item.key}
              onClick={() => { handleTabChange(item.key); setSidebarOpen(false); }}
              className={navBtnClass(item.key)}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.locked && <Lock className="w-3.5 h-3.5 opacity-50" />}
            </button>
          ))}

          {/* Operações separator */}
          <div className="pt-5 pb-2 px-3">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Operações</p>
          </div>

          {navItemsOps.map((item) => (
            <button
              key={item.key}
              onClick={() => { handleTabChange(item.key); setSidebarOpen(false); }}
              className={navBtnClass(item.key)}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.locked && <Lock className="w-3.5 h-3.5 opacity-50" />}
            </button>
          ))}

          {/* Divider */}
          <div className="pt-4 pb-1">
            <div className="border-t border-white/10" />
          </div>

          {navItemsBottom.map((item) => (
            <button
              key={item.key}
              onClick={() => { handleTabChange(item.key); setSidebarOpen(false); }}
              className={navBtnClass(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-0.5">
          {!appInstalled && (
            <button
              onClick={() => {
                if (installPrompt) {
                  handleInstallApp();
                } else {
                  toast("Para instalar o app, toque nos 3 pontinhos do navegador (ou no botão Compartilhar no iPhone) e selecione \"Instalar app\" ou \"Adicionar à tela inicial\".", { duration: 8000 });
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/15 transition-all duration-150"
            >
              <Download className="w-4 h-4" />
              Instalar App
            </button>
          )}
          <button
            onClick={() => {
              const msg = encodeURIComponent("Cansado de perder tempo anotando pedido no papel? 📝 Conheça o TrendFood: o sistema que vai agilizar sua cozinha e organizar seu delivery em poucos cliques. 🚀\n\nConfira como funciona: https://trendfood.lovable.app");
              window.open(`https://wa.me/?text=${msg}`, "_blank");
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-all duration-150"
          >
            <Share2 className="w-4 h-4" />
            Indique o TrendFood
          </button>
          <a
            href="/docs/impressora-termica"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all duration-150"
          >
            <Printer className="w-4 h-4" />
            Impressora Térmica
          </a>
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
          {/* Trial banners */}
          {planLimits.trialActive && (
            <div className="mb-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Você tem <strong>{planLimits.trialDaysLeft} {planLimits.trialDaysLeft === 1 ? "dia" : "dias"}</strong> restantes do plano Pro grátis!
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/planos"><Zap className="w-3.5 h-3.5" />Assinar Pro</Link>
              </Button>
            </div>
          )}
          {planLimits.trialExpired && planLimits.plan === "free" && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Seu período de teste Pro expirou. Faça upgrade para continuar usando todos os recursos.
                </p>
              </div>
              <Button asChild size="sm" variant="destructive" className="gap-1.5">
                <Link to="/planos"><Zap className="w-3.5 h-3.5" />Fazer upgrade</Link>
              </Button>
            </div>
          )}

          {activeTab === "home" && <HomeTab organization={organization} />}
          {activeTab === "menu" && <MenuTab organization={organization} menuItemLimit={planLimits.menuItemLimit} />}
          {activeTab === "tables" && <TablesTab organization={organization} tableLimit={planLimits.tableLimit} />}
          {activeTab === "history" && <HistoryTab orgId={organization.id} restrictTo7Days={!planLimits.canAccess("history_full")} />}
          {activeTab === "coupons" && (lockedFeatures.coupons
            ? <UpgradePrompt title="Cupons de Desconto" description="Crie e gerencie cupons de desconto para seus clientes. Disponível nos planos Pro e Enterprise." />
            : <CouponsTab orgId={organization.id} />)}
          {activeTab === "bestsellers" && (lockedFeatures.bestsellers
            ? <UpgradePrompt title="Mais Vendidos" description="Veja os itens mais vendidos do seu cardápio. Disponível nos planos Pro e Enterprise." />
            : <BestSellersTab orgId={organization.id} />)}
          {activeTab === "kitchen" && (lockedFeatures.kitchen
            ? <UpgradePrompt title="Painel da Cozinha (KDS)" description="Gerencie pedidos em tempo real com o KDS. Disponível nos planos Pro e Enterprise." />
            : <KitchenTab orgId={organization.id} orgName={organization.name} storeAddress={organization.store_address} courierConfig={(organization as any).courier_config} printMode={(organization as any).print_mode ?? 'browser'} printerWidth={(organization as any).printer_width ?? '58mm'} pixKey={(organization as any).pix_key} btDevice={btDevice} />)}
          {activeTab === "waiter" && (lockedFeatures.waiter
            ? <UpgradePrompt title="Painel do Garçom" description="Controle pedidos e mesas com o painel do garçom. Disponível nos planos Pro e Enterprise." />
            : <WaiterTab orgId={organization.id} whatsapp={organization.whatsapp} orgName={organization.name} pixConfirmationMode={(organization as any).pix_confirmation_mode ?? "direct"} pixKey={(organization as any).pix_key} />)}
          {activeTab === "caixa" && (lockedFeatures.caixa
            ? <UpgradePrompt title="Controle de Caixa" description="Gerencie abertura e fechamento de caixa. Disponível nos planos Pro e Enterprise." />
            : <CaixaTab orgId={organization.id} />)}
          {activeTab === "features" && <FeaturesTab effectivePlan={planLimits.effectivePlan} />}
          {activeTab === "reports" && (lockedFeatures.reports
            ? <UpgradePrompt title="Relatórios Avançados" description="Gráficos de faturamento, ticket médio, horários de pico e comparativos. Disponível nos planos Enterprise e Vitalício." />
            : <ReportsTab orgId={organization.id} orgName={organization.name} orgLogo={organization.logo_url} orgWhatsapp={organization.whatsapp} orgAddress={organization.store_address} orgEmoji={organization.emoji} />)}
          {activeTab === "guide" && <GuideTab />}
          {activeTab === "profile" && <StoreProfileTab organization={organization} />}
          {activeTab === "settings" && <SettingsTab btDevice={btDevice} btConnected={btConnected} onPairBluetooth={handlePairBluetooth} onDisconnectBluetooth={handleDisconnectBluetooth} btSupported={btSupported} />}
          {activeTab === "courier" && <CourierDashboardTab orgId={organization.id} orgSlug={organization.slug} orgName={organization.name} orgEmoji={organization.emoji} orgLogo={(organization as any).logo_url} orgWhatsapp={(organization as any).whatsapp} orgAddress={(organization as any).store_address} courierConfig={(organization as any).courier_config} />}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
