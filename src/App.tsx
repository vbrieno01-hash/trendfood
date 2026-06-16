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

export const RouteFallback = ({ forceShow }: { forceShow?: boolean } = {}) => {
  // 0–250ms: tela em branco (evita piscar em chunks já em cache).
  // >250ms: já mostra o card com botão grande de "Reconectar agora".
  const [show, setShow] = useState<boolean>(!!forceShow);
  useEffect(() => {
    if (forceShow) return;
    const t = setTimeout(() => setShow(true), 250);
    return () => clearTimeout(t);
  }, [forceShow]);
  if (!show) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  return (
    <div
      aria-live="polite"
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.20),transparent_55%),radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.15),transparent_60%),hsl(var(--background))]"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:42px_42px]"
      />
      <div aria-hidden className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* borda gradiente */}
        <div className="absolute -inset-px rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)),transparent)] opacity-60" />
        <div className="relative rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-xl shadow-[0_24px_80px_-20px_hsl(var(--primary)/0.35)] p-7 sm:p-9">
          {/* ícone de sinal animado */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-[inset_0_0_30px_hsl(var(--primary)/0.15)]">
            <svg viewBox="0 0 48 48" className="h-12 w-12 text-primary" fill="none" strokeLinecap="round">
              <path d="M6 22c10-10 26-10 36 0" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
              <path d="M12 28c7-7 17-7 24 0" stroke="currentColor" strokeWidth="2.5" opacity="0.55" className="animate-pulse" />
              <path d="M18 34c3.5-3.5 8.5-3.5 12 0" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="24" cy="39" r="2.4" fill="currentColor" />
              {/* faísca quebrada */}
              <path d="M34 12l4 4M38 12l-4 4" stroke="hsl(var(--destructive))" strokeWidth="2" />
            </svg>
          </div>

          <h1 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--primary)))]">
            Sinal fraco detectado
          </h1>
          <p className="mt-3 text-center text-sm text-muted-foreground leading-relaxed">
            Sua conexão está instável no momento. Nossos servidores estão prontos —
            assim que sua internet melhorar, sua loja carrega na hora.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="group relative mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-primary-foreground bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] transition hover:shadow-[0_14px_40px_-10px_hsl(var(--primary)/0.8)] hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500">
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Reconectar agora
          </button>

          <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              status: reconectando
            </span>
            <span className="opacity-60">trendfood · v2</span>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
          Powered by Trendfood
        </p>
      </div>
    </div>
  );
};

const ConditionalSupportChat = () => {
  const { pathname } = useLocation();
  const internalRoutes = ["/dashboard", "/cozinha", "/garcom", "/admin"];
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
              <Route path="/_preview/fallback" element={<PreviewFallback />} />
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
