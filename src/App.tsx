import { useEffect, lazy, Suspense, useState } from "react";
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
import ScrollToTop from "./components/ScrollToTop";
import SupportChatWidget from "./components/SupportChatWidget";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";

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

const RouteFallback = () => {
  // Estágios:
  //  0 (0-250ms): nada — evita "piscar" em chunks já em cache.
  //  1 (250ms-8s): spinner.
  //  2 (>8s): aviso "Conexão lenta" com botão de tentar de novo.
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 250);
    const t2 = setTimeout(() => setStage(2), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (stage === 0) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  if (stage === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-4xl">📶</p>
        <h1 className="text-xl font-bold text-foreground">Sua internet está lenta</h1>
        <p className="text-sm text-muted-foreground">
          Estamos tentando carregar a loja, mas sua conexão está muito devagar.
          Verifique seu Wi-Fi ou dados móveis e toque no botão abaixo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition w-full"
        >
          Tentar novamente
        </button>
        <p className="text-[11px] text-muted-foreground">
          Se continuar, troque de rede ou aguarde alguns segundos.
        </p>
      </div>
    </div>
  );
};

const ConditionalSupportChat = () => {
  const { pathname } = useLocation();
  const internalRoutes = ["/dashboard", "/cozinha", "/garcom", "/admin", "/motoboy"];
  if (!internalRoutes.some(r => pathname.startsWith(r))) return null;
  return <SupportChatWidget />;
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
            <Suspense fallback={<RouteFallback />}>
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
              <Route path="/instalar" element={<InstallPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AppInner />
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
