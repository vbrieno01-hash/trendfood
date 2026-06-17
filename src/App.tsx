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

export const RouteFallback = (_props: { forceShow?: boolean } = {}) => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ticket = `#${String(Math.floor(Math.random() * 9000) + 1000)}`;
  return (
    <div
      aria-live="polite"
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 bg-[#ece7df] text-[#111]"
      style={{ fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
    >
      {/* ruído sutil de papel */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.10) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 7px 7px",
          backgroundPosition: "0 0, 1px 2px",
        }}
      />

      <div className="relative w-full max-w-[340px]">
        {/* Borda serrilhada superior (rasgo de papel) */}
        <div aria-hidden className="h-3 w-full" style={{
          backgroundImage: "radial-gradient(circle at 6px 0, transparent 5px, #fdfaf3 5.5px)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 -6px",
          backgroundRepeat: "repeat-x",
        }} />

        {/* Corpo do ticket */}
        <div className="relative bg-[#fdfaf3] px-6 pt-5 pb-6 shadow-[6px_8px_0_rgba(0,0,0,0.85)]">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
            <span>TRENDFOOD · POS</span>
            <span>{hh}:{mm}</span>
          </div>
          <div className="mt-1 border-t border-dashed border-black/40" />

          {/* Marca enorme */}
          <div className="mt-5 leading-[0.82]">
            <div className="text-[88px] font-black tracking-[-0.06em] text-black">
              ERR<span className="text-[#e85d3a]">·</span>
            </div>
            <div className="text-[88px] font-black tracking-[-0.06em] text-black -mt-3">
              503
            </div>
          </div>

          {/* Etiqueta do erro */}
          <div className="mt-4 inline-flex items-center gap-2 bg-black text-[#fdfaf3] px-2 py-1 text-[10px] tracking-[0.22em] uppercase font-bold">
            <span className="inline-block h-1.5 w-1.5 bg-[#e85d3a] animate-pulse" />
            Comanda perdida
          </div>

          {/* Mensagem em forma de pedido */}
          <dl className="mt-5 space-y-2 text-[12px] leading-snug">
            <div className="flex justify-between gap-3">
              <dt className="text-black/70">Cliente</dt>
              <dd className="text-right text-black">você</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/70">Pedido</dt>
              <dd className="text-right text-black uppercase">abrir a loja</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/70">Status</dt>
              <dd className="text-right">
                <span className="bg-[#e85d3a]/15 text-[#a8401f] px-1.5 py-0.5 uppercase tracking-wider text-[10px] font-bold">
                  sinal fraco
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/70">Cozinha</dt>
              <dd className="text-right text-black">pronta · aguardando rede</dd>
            </div>
          </dl>

          <div className="my-5 border-t border-dashed border-black/40" />

          {/* Observação manuscrita */}
          <p className="text-[12.5px] leading-relaxed text-black">
            <span className="font-bold">Obs do garçom:</span> sua internet caiu um instante.
            A loja continua aqui — toca o botão e a gente reimprime o pedido pra você.
          </p>

          {/* Botão carimbo */}
          <button
            onClick={() => window.location.reload()}
            className="group mt-5 w-full bg-black text-[#fdfaf3] py-3.5 text-[12px] uppercase tracking-[0.22em] font-bold flex items-center justify-between px-4 hover:bg-[#e85d3a] active:translate-y-[1px] transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 bg-[#e85d3a] group-hover:bg-black" />
              Reimprimir
            </span>
            <span className="opacity-70 group-hover:opacity-100">↻</span>
          </button>

          {/* Rodapé do ticket */}
          <div className="mt-5 flex items-center justify-between text-[9px] uppercase tracking-[0.25em] text-black/60">
            <span>cx 01 · op trendfood</span>
            <span>{ticket}</span>
          </div>

          {/* Barras de código fake */}
          <div aria-hidden className="mt-4 flex h-10 items-end gap-[2px]">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="bg-black"
                style={{
                  width: (i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1) + "px",
                  height: "100%",
                  opacity: i % 7 === 0 ? 0.4 : 1,
                }}
              />
            ))}
          </div>
          <div className="mt-2 text-center text-[9px] tracking-[0.4em] uppercase text-black/70">
            obrigado · volte sempre
          </div>
        </div>

        {/* Borda serrilhada inferior */}
        <div aria-hidden className="h-3 w-full" style={{
          backgroundImage: "radial-gradient(circle at 6px 12px, transparent 5px, #fdfaf3 5.5px)",
          backgroundSize: "12px 12px",
          backgroundRepeat: "repeat-x",
        }} />

        {/* Assinatura — minúscula, fora do papel */}
        <p className="mt-6 text-center text-[9px] uppercase tracking-[0.5em] text-black/50">
          impresso por trendfood
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
