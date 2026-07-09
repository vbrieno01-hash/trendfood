import { useEffect, lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { logClientError, isIgnorableError } from "@/lib/errorLogger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PreviewFallback from "./pages/_PreviewFallback";
import { routeLoaders, prefetchRoute } from "@/lib/routeLoaders";
const AuthPage = lazy(routeLoaders.auth);
const UnitPage = lazy(routeLoaders.unit);
const DashboardPage = lazy(routeLoaders.dashboard);
const KitchenPage = lazy(routeLoaders.kitchen);
const WaiterPage = lazy(routeLoaders.waiter);
const TableOrderPage = lazy(routeLoaders.tableOrder);
const AdminPage = lazy(routeLoaders.admin);
const DocsTerminalPage = lazy(routeLoaders.docsTerminal);
const PricingPage = lazy(routeLoaders.pricing);
const CourierPage = lazy(routeLoaders.courier);
const TermsPage = lazy(routeLoaders.terms);
const PrivacyPage = lazy(routeLoaders.privacy);
const ResetPasswordPage = lazy(routeLoaders.resetPassword);
const ReviewPage = lazy(routeLoaders.review);
const InstallPage = lazy(routeLoaders.install);
const IndiquePage = lazy(routeLoaders.indique);
const CardapioWhatsappPage = lazy(routeLoaders.cardapioWhatsapp);
const CardapioQrPage = lazy(routeLoaders.cardapioQr);
const AltIfoodPage = lazy(routeLoaders.altIfood);
const PdvGratisPage = lazy(routeLoaders.pdvGratis);
const DeliverySemTaxaPage = lazy(routeLoaders.deliverySemTaxa);
import ScrollToTop from "./components/ScrollToTop";
import SupportChatWidget from "./components/SupportChatWidget";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";
import TicketScreen from "./components/TicketScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000,
      networkMode: "always",
    },
    mutations: {
      retry: 0,
      networkMode: "always",
    },
  },
});

export const RouteFallback = (_props: { forceShow?: boolean } = {}) => {
  return (
    <TicketScreen
      code="ERR·503"
      tag="Comanda em espera"
      pedido="abrir a loja"
      status="sinal fraco"
      obs="Sua internet deu uma travada agora. A cozinha tá pronta — assim que voltar, a gente reimprime na hora."
      cta="Reimprimir"
      onClick={() => window.location.reload()}
    />
  );
};

const ConditionalSupportChat = () => {
  const { pathname } = useLocation();
  const internalRoutes = ["/dashboard", "/cozinha", "/garcom", "/admin"];
  if (!internalRoutes.some(r => pathname.startsWith(r))) return null;
  return <SupportChatWidget />;
};

// Envolve as rotas num container keyado por pathname para disparar um fade curto
// (150ms, opacity-only) a cada troca de rota. Não afeta layout — animação puramente
// visual, respeita prefers-reduced-motion via CSS.
const AnimatedRoutes = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  // Chave por pathname (ignora search/hash) — evita re-animar em mudanças de query.
  return (
    <div key={location.pathname} className="animate-page-fade">
      {children}
    </div>
  );
};

const isChunkError = (msg: string) =>
  msg.includes("Failed to fetch dynamically imported module") ||
  msg.includes("Importing a module script failed") ||
  msg.includes("error loading dynamically imported module") ||
  msg.includes("Loading chunk") ||
  msg.includes("Loading CSS chunk");

// Recupera de chunk velho com até 2 tentativas, limpando SW+caches antes de recarregar.
async function recoverFromStaleChunk(source: string): Promise<boolean> {
  try {
    const KEY = "chunk_reload_count";
    const LAST = "chunk_reload_last_ts";
    const now = Date.now();
    const last = Number(sessionStorage.getItem(LAST) || "0");
    const count = Number(sessionStorage.getItem(KEY) || "0");
    if (count >= 2) return false;
    if (now - last < 5000) return false; // gap mínimo de 5s
    sessionStorage.setItem(KEY, String(count + 1));
    sessionStorage.setItem(LAST, String(now));
    console.info(`[Auto-Reload] chunk velho detectado (${source}), limpando caches e recarregando…`);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch (e) {
      console.warn("[Auto-Reload] cache clear falhou:", e);
    }
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

const AppInner = () => {
  useEffect(() => {
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
      if (isIgnorableError(msg)) return;
      if (isChunkError(msg)) {
        e.preventDefault();
        void recoverFromStaleChunk("rejection");
        return;
      }
      console.error("[Unhandled Rejection]", e.reason);
      e.preventDefault();
      const stack = e.reason instanceof Error ? e.reason.stack : undefined;
      logClientError({ message: msg, stack, source: "unhandled_rejection" });
    };

    const errorHandler = (e: ErrorEvent) => {
      if (isIgnorableError(e.message)) return;
      if (isChunkError(e.message)) {
        void recoverFromStaleChunk("error");
        return;
      }
      logClientError({
        message: e.message,
        stack: e.error?.stack,
        source: "global_error",
        metadata: { filename: e.filename, lineno: e.lineno, colno: e.colno },
      });
    };

    window.addEventListener("unhandledrejection", rejectionHandler);
    window.addEventListener("error", errorHandler);

    return () => {
      window.removeEventListener("unhandledrejection", rejectionHandler);
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  // Auto-heal: se a app crashou na sessão anterior, limpar SW e caches
  useEffect(() => {
    try {
      const crashed = sessionStorage.getItem("app_crashed");
      if (crashed) {
        sessionStorage.removeItem("app_crashed");
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => r.unregister());
          });
        }
        if ('caches' in window) {
          caches.keys().then(names => names.forEach(n => caches.delete(n)));
        }
        console.info("[AutoHeal] SW e caches limpos após crash anterior");
      }
    } catch (_) {}
  }, []);

  // Pré-carrega chunks das rotas críticas em idle — quando o usuário clicar,
  // o chunk já está em memória/cache do browser → navegação instantânea.
  useEffect(() => {
    const ric: typeof requestIdleCallback =
      (window as any).requestIdleCallback ||
      ((cb: any) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1500));
    const handle = ric(() => {
      const path = window.location.pathname;
      const critical: Array<keyof typeof routeLoaders> = path.startsWith("/dashboard")
        ? ["kitchen", "waiter", "admin", "pricing"]
        : path.startsWith("/unidade")
        ? ["tableOrder", "review"]
        : ["auth", "dashboard", "pricing", "unit"];
      critical.forEach((k) => prefetchRoute(k));
    });
    return () => {
      if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
            <AnimatedRoutes>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/cadastro" element={<AuthPage />} />
              <Route path="/unidade/:slug" element={<UnitPage />} />
              <Route path="/unidade/:slug/mesa/:tableNumber" element={<TableOrderPage />} />
              <Route path="/cozinha" element={<KitchenPage />} />
              <Route path="/garcom" element={<WaiterPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/planos" element={<PricingPage />} />
              <Route path="/docs/impressora-termica" element={<DocsTerminalPage />} />
              <Route path="/motoboy" element={<CourierPage />} />
              <Route path="/termos" element={<TermsPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
              <Route path="/avaliar/:slug/:orderId" element={<ReviewPage />} />
              <Route path="/avaliar/:slug" element={<ReviewPage />} />
              <Route path="/instalar" element={<InstallPage />} />
              <Route path="/indique" element={<IndiquePage />} />
              <Route path="/cardapio-digital-whatsapp" element={<CardapioWhatsappPage />} />
              <Route path="/cardapio-digital-qr-code" element={<CardapioQrPage />} />
              <Route path="/alternativa-ao-ifood" element={<AltIfoodPage />} />
              <Route path="/pdv-restaurante-gratis" element={<PdvGratisPage />} />
              <Route path="/delivery-sem-taxa" element={<DeliverySemTaxaPage />} />
              <Route path="/_preview/fallback" element={<PreviewFallback />} />
              {/* Short link: /:slug — mantém /unidade/:slug funcional para compat */}
              <Route path="/:slug" element={<UnitPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AnimatedRoutes>
            </Suspense>
            <ConditionalSupportChat />
            <PWAUpdatePrompt />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppInner />
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
