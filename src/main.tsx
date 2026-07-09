import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

/**
 * Cleanup global de Service Workers antigos do Workbox/VitePWA.
 * Roda SEMPRE — em qualquer ambiente — pra liberar lojas presas em bundles antigos.
 * Mantém apenas /sw-push.js (push notifications), que é registrado separadamente.
 */
async function cleanupLegacyServiceWorkers() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
        // Mantém só o sw-push.js. Desregistra qualquer outro (workbox, sw.js do VitePWA, etc).
        if (!url.includes("/sw-push.js")) {
          console.info("[SW Cleanup] desregistrando SW legado:", url);
          await reg.unregister();
        }
      }
    }

    // Limpa caches do Workbox/VitePWA
    if ("caches" in window) {
      const keys = await caches.keys();
      const legacy = keys.filter(
        (k) =>
          k.includes("workbox") ||
          k.includes("precache") ||
          k.startsWith("vite-pwa") ||
          k.includes("runtime")
      );
      await Promise.all(
        legacy.map((k) => {
          console.info("[SW Cleanup] limpando cache:", k);
          return caches.delete(k);
        })
      );
    }
  } catch (e) {
    console.info("[SW Cleanup] falhou (ignorando)", e);
  }
}

// Em preview/iframe: cleanup completo (inclui sw-push)
if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else {
  // Produção: roda cleanup uma vez por cliente (flag bumpa quando precisar re-disparar)
  // v4 — força limpeza geral pra eliminar tela antiga "Algo deu errado" cacheada (jun/2026)
  const CLEANUP_FLAG = "sw_cleanup_v4";
  if (!localStorage.getItem(CLEANUP_FLAG)) {
    cleanupLegacyServiceWorkers().finally(() => {
      localStorage.setItem(CLEANUP_FLAG, String(Date.now()));
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
