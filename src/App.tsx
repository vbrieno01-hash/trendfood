import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import UnitPage from "./pages/UnitPage";
import DashboardPage from "./pages/DashboardPage";
import KitchenPage from "./pages/KitchenPage";
import WaiterPage from "./pages/WaiterPage";
import TableOrderPage from "./pages/TableOrderPage";
import AdminPage from "./pages/AdminPage";
import DocsTerminalPage from "./pages/DocsTerminalPage";
import PricingPage from "./pages/PricingPage";
import CourierPage from "./pages/CourierPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      networkMode: "always",
    },
    mutations: {
      retry: 0,
      networkMode: "always",
    },
  },
});

const AppInner = () => {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      console.error("[Unhandled Rejection]", e.reason);
      e.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);

    // Hide splash screen on native
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }

    return () => window.removeEventListener("unhandledrejection", handler);
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
);

export default App;
