import { useEffect, useState } from "react";
import { useVersionPoller } from "./useVersionPoller";

const SNOOZE_KEY = "pwa_snooze_until";
const SNOOZE_FP_KEY = "pwa_snooze_fp"; // fingerprint que estava ativo quando o user clicou "mais tarde"
const FIRST_SEEN_KEY = "pwa_first_seen";
const LAST_SEEN_FP_KEY = "pwa_last_seen_fp";
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
 * Limpa todos os SWs (exceto sw-push) e caches, depois força reload com cache-bust.
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
  try {
    localStorage.removeItem("sw_cleanup_v2");
  } catch {}

  // Cache-bust agressivo: força o navegador a baixar o index.html novo
  // ao invés de servir do cache HTTP. Sem isso, alguns navegadores podem
  // segurar o bundle antigo mesmo após nuke do SW.
  const url = window.location.pathname + window.location.search
    + (window.location.search ? "&" : "?") + "_v=" + Date.now()
    + window.location.hash;
  window.location.replace(url);
}

export function usePWAUpdate() {
  const { hasNewVersion: serverHasNewVersion, currentFingerprint, checkNow: pollerCheckNow } = useVersionPoller();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!serverHasNewVersion || isPreviewHost || isInIframe) {
      setShowPrompt(false);
      return;
    }

    if (!localStorage.getItem(FIRST_SEEN_KEY)) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
    }

    const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    const snoozeFp = localStorage.getItem(SNOOZE_FP_KEY);
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

    // Reseta snooze se o fingerprint mudou desde o último "mais tarde"
    // (ou seja: tem versão NOVA além da que ele já adiou)
    if (snoozeFp && currentFingerprint && snoozeFp !== currentFingerprint) {
      console.info("[PWA] Nova versão detectada após snooze — limpando snooze");
      localStorage.removeItem(SNOOZE_KEY);
      localStorage.removeItem(SNOOZE_FP_KEY);
      setShowPrompt(true);
      return;
    }

    setShowPrompt(now >= snoozeUntil);
  }, [serverHasNewVersion, currentFingerprint]);

  const handleUpdate = () => {
    localStorage.removeItem(SNOOZE_KEY);
    localStorage.removeItem(SNOOZE_FP_KEY);
    localStorage.removeItem(FIRST_SEEN_KEY);
    // Atualiza o fingerprint persistido pra versão atual antes de recarregar,
    // assim a próxima sessão começa "limpa".
    if (currentFingerprint) {
      try {
        localStorage.setItem(LAST_SEEN_FP_KEY, currentFingerprint);
      } catch {}
    }
    nukeAndReload();
  };

  const handleSnooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION_MS));
    if (currentFingerprint) {
      localStorage.setItem(SNOOZE_FP_KEY, currentFingerprint);
    }
    setShowPrompt(false);
    setTimeout(() => {
      if (serverHasNewVersion) setShowPrompt(true);
    }, SNOOZE_DURATION_MS);
  };

  /** Força check manual. Retorna true se houver nova versão. */
  const checkNow = async (): Promise<boolean> => {
    return await pollerCheckNow();
  };

  return { showPrompt, handleUpdate, handleSnooze, checkNow };
}
