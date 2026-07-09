// Loaders centralizados de rotas + helper de prefetch.
// Usado por App.tsx (lazy()) e por <PrefetchLink> para baixar o chunk
// no hover/focus, antes do clique → navegação fica instantânea.

export const routeLoaders = {
  auth: () => import("@/pages/AuthPage"),
  unit: () => import("@/pages/UnitPage"),
  dashboard: () => import("@/pages/DashboardPage"),
  kitchen: () => import("@/pages/KitchenPage"),
  waiter: () => import("@/pages/WaiterPage"),
  tableOrder: () => import("@/pages/TableOrderPage"),
  admin: () => import("@/pages/AdminPage"),
  docsTerminal: () => import("@/pages/DocsTerminalPage"),
  pricing: () => import("@/pages/PricingPage"),
  courier: () => import("@/pages/CourierPage"),
  terms: () => import("@/pages/TermsPage"),
  privacy: () => import("@/pages/PrivacyPage"),
  resetPassword: () => import("@/pages/ResetPasswordPage"),
  review: () => import("@/pages/ReviewPage"),
  install: () => import("@/pages/InstallPage"),
  indique: () => import("@/pages/Indique"),
  cardapioWhatsapp: () => import("@/pages/CardapioDigitalWhatsapp"),
} as const;

export type RouteKey = keyof typeof routeLoaders;

const prefetched = new Set<RouteKey>();

export function prefetchRoute(key: RouteKey) {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  // Falha silenciosa: prefetch é best-effort.
  routeLoaders[key]().catch(() => prefetched.delete(key));
}

// Mapeia path → chave de rota para prefetch via <PrefetchLink>.
export function routeKeyForPath(path: string): RouteKey | null {
  if (path === "/auth" || path === "/cadastro") return "auth";
  if (path === "/dashboard") return "dashboard";
  if (path === "/cozinha") return "kitchen";
  if (path === "/garcom") return "waiter";
  if (path === "/admin") return "admin";
  if (path === "/planos") return "pricing";
  if (path === "/motoboy") return "courier";
  if (path === "/termos") return "terms";
  if (path === "/privacidade") return "privacy";
  if (path === "/redefinir-senha") return "resetPassword";
  if (path === "/instalar") return "install";
  if (path === "/docs/impressora-termica") return "docsTerminal";
  if (path.startsWith("/unidade/") && path.includes("/mesa/")) return "tableOrder";
  if (path.startsWith("/unidade/")) return "unit";
  if (path.startsWith("/avaliar/")) return "review";
  return null;
}