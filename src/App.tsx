import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import UnitPage from "./pages/UnitPage";
import DashboardPage from "./pages/DashboardPage";
import KitchenPage from "./pages/KitchenPage";
import WaiterPage from "./pages/WaiterPage";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/cadastro" element={<AuthPage />} />
            <Route path="/unidade/:slug" element={<UnitPage />} />
            <Route path="/unidade/:slug/mesa/:tableNumber" element={<UnitPage />} />
            <Route path="/cozinha" element={<KitchenPage />} />
            <Route path="/garcom" element={<WaiterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
