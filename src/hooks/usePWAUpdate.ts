import { useEffect, useState } from "react";
import { useVersionPoller } from "./useVersionPoller";

const SNOOZE_KEY = "pwa_snooze_until";
const FIRST_SEEN_KEY = "pwa_first_seen";
const SNOOZE_DURATION_MS = 60 * 60 * 1000; // 1h
const FORCE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com"));

/**
 * Limpa todos os SWs (exceto sw-push) e caches, depois força reload.
 * Última saída pra qualquer cache preso.
 */
async function nukeAndReload() {
  console.info("[PWA] nukeAndReload — limpando SWs e caches");
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map((r) => {
          const url = r.active?.scriptURL || "";
          // Preserva sw-push pra não perder notificações
          if (url.includes("/sw-push.js")) return Promise.resolve(false);
          return r.unregister();
        })
      );
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.info("[PWA] nuke falhou (ignorando)", e);
  }
  // Reset flag pra cleanup re-rodar se precisar
  try {
    localStorage.removeItem("sw_cleanup_v2");
  } catch {}
  window.location.reload();
}

export function usePWAUpdate() {
  const serverHasNewVersion = useVersionPoller();
  const [showPrompt, setShowPrompt] = useState(false);

  // Controla snooze — dispara via poller (independente de SW)
  useEffect(() => {
    if (!serverHasNewVersion || isPreviewHost || isInIframe) {
      setShowPrompt(false);
      return;
    }

    if (!localStorage.getItem(FIRST_SEEN_KEY)) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
    }

    const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    const firstSeen = Number(localStorage.getItem(FIRST_SEEN_KEY) || Date.now());
    const now = Date.now();

    // Auto-force após 24h ignorando — só se não tiver input em foco
    if (now - firstSeen > FORCE_AFTER_MS) {
      const active = document.activeElement;
      const typing =
        active?.tagName === "INPUT" || active?.tagName === "TEXTAREA";
      if (!typing) {
        handleUpdate();
        return;
      }
    }

    setShowPrompt(now >= snoozeUntil);
  }, [serverHasNewVersion]);

  const handleUpdate = () => {
    localStorage.removeItem(SNOOZE_KEY);
    localStorage.removeItem(FIRST_SEEN_KEY);
    nukeAndReload();
  };

  const handleSnooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION_MS));
    setShowPrompt(false);
    setTimeout(() => {
      if (serverHasNewVersion) setShowPrompt(true);
    }, SNOOZE_DURATION_MS);
  };

  /** Força check manual. Retorna true se houver nova versão. */
  const checkNow = async (): Promise<boolean> => {
    // Re-fetch o index.html agora pra forçar comparação
    try {
      const res = await fetch(`/index.html?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        // Aguarda o poller ter chance de atualizar estado
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch {}
    return serverHasNewVersion;
  };

  return { showPrompt, handleUpdate, handleSnooze, checkNow };
}
