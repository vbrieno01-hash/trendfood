import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const SNOOZE_KEY = "pwa_snooze_until";
const FIRST_SEEN_KEY = "pwa_first_seen";
const SNOOZE_DURATION_MS = 60 * 60 * 1000; // 1h
const FORCE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 min — detecção rápida pós-publish

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

export function usePWAUpdate() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.info("[PWA] SW registrado", swUrl);
      if (!r) return;
      registrationRef.current = r;

      // Check imediato no mount
      r.update().catch((e) => console.info("[PWA] update inicial falhou", e));

      // Polling a cada 2 min
      setInterval(() => {
        console.info("[PWA] polling update...");
        r.update().catch(() => {});
      }, POLL_INTERVAL_MS);
    },
    onNeedRefresh() {
      console.info("[PWA] needRefresh=true — nova versão detectada");
    },
  });

  const [showPrompt, setShowPrompt] = useState(false);

  // Listeners: focar aba + voltar online → forçar update
  useEffect(() => {
    if (isPreviewHost || isInIframe) return;

    const checkForUpdate = (reason: string) => {
      const r = registrationRef.current;
      if (!r) return;
      console.info(`[PWA] revalidando (${reason})`);
      r.update().catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate("visibilitychange");
      }
    };
    const onOnline = () => checkForUpdate("online");
    const onFocus = () => checkForUpdate("focus");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Controla snooze
  useEffect(() => {
    if (!needRefresh || isPreviewHost || isInIframe) {
      setShowPrompt(false);
      return;
    }

    // Marca primeira vez que viu essa atualização
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
  }, [needRefresh]);

  const handleUpdate = () => {
    localStorage.removeItem(SNOOZE_KEY);
    localStorage.removeItem(FIRST_SEEN_KEY);
    updateServiceWorker(true);
  };

  const handleSnooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION_MS));
    setShowPrompt(false);
    setNeedRefresh(false);
    setTimeout(() => {
      if (needRefresh) setShowPrompt(true);
    }, SNOOZE_DURATION_MS);
  };

  return { showPrompt, handleUpdate, handleSnooze };
}
