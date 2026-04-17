import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useVersionPoller } from "./useVersionPoller";

const SNOOZE_KEY = "pwa_snooze_until";
const FIRST_SEEN_KEY = "pwa_first_seen";
const SNOOZE_DURATION_MS = 60 * 60 * 1000; // 1h
const FORCE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h
const POLL_INTERVAL_MS = 60 * 1000; // 60s — agressivo p/ pegar updates rápido em PWA standalone

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

/** Limpa todos os SWs e caches, depois força reload. Última saída pra SW preso. */
async function nukeAndReload() {
  console.info("[PWA] nukeAndReload — limpando SWs e caches");
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.info("[PWA] nuke falhou (ignorando)", e);
  }
  // Reload com bypass de cache
  window.location.reload();
}

export function usePWAUpdate() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const serverHasNewVersion = useVersionPoller();

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

      // Check com delay curto (cobre race condition de SW ainda registrando)
      setTimeout(() => {
        r.update().catch(() => {});
      }, 3000);

      // Listener: novo SW detectado baixando — sinal mais cedo que needRefresh
      r.addEventListener("updatefound", () => {
        console.info("[PWA] updatefound — novo SW detectado");
        const newWorker = r.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            console.info("[PWA] novo SW state:", newWorker.state);
          });
        }
      });
    },
    onNeedRefresh() {
      console.info("[PWA] needRefresh=true — nova versão detectada");
    },
  });

  const [showPrompt, setShowPrompt] = useState(false);

  // Polling SEMPRE ativo (não depende de quando onRegisteredSW disparou)
  useEffect(() => {
    if (isPreviewHost || isInIframe) return;

    const id = setInterval(() => {
      const r = registrationRef.current;
      if (!r) return;
      console.info("[PWA] polling update...");
      r.update().catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  // Listener: SW novo assumiu controle → sinal direto que algo mudou
  useEffect(() => {
    if (isPreviewHost || isInIframe) return;
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      console.info("[PWA] controllerchange — SW novo assumiu controle");
      // Força recheck do estado de needRefresh
      registrationRef.current?.update().catch(() => {});
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

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
    const onPageShow = () => checkForUpdate("pageshow");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Controla snooze — agora dispara se needRefresh OU serverHasNewVersion
  useEffect(() => {
    const newVersionDetected = needRefresh || serverHasNewVersion;

    if (!newVersionDetected || isPreviewHost || isInIframe) {
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
  }, [needRefresh, serverHasNewVersion]);

  const handleUpdate = () => {
    localStorage.removeItem(SNOOZE_KEY);
    localStorage.removeItem(FIRST_SEEN_KEY);

    // Tenta caminho normal
    try {
      updateServiceWorker(true);
    } catch (e) {
      console.info("[PWA] updateServiceWorker falhou", e);
    }

    // Se em 3s não recarregou (SW preso, sem waiting, etc), força nuke
    setTimeout(() => {
      console.info("[PWA] reload não disparou em 3s — forçando nuke");
      nukeAndReload();
    }, 3000);
  };

  const handleSnooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION_MS));
    setShowPrompt(false);
    setNeedRefresh(false);
    setTimeout(() => {
      if (needRefresh || serverHasNewVersion) setShowPrompt(true);
    }, SNOOZE_DURATION_MS);
  };

  /** Força check manual + update se houver. Retorna se encontrou nova versão. */
  const checkNow = async (): Promise<boolean> => {
    const r = registrationRef.current;
    if (!r) {
      // Sem SW — confia no poller
      return serverHasNewVersion;
    }
    try {
      await r.update();
      // Aguarda o navegador processar
      await new Promise((res) => setTimeout(res, 3000));
      const hasWaiting = !!r.waiting;
      if (hasWaiting || needRefresh || serverHasNewVersion) {
        return true;
      }
      return false;
    } catch (e) {
      console.info("[PWA] checkNow falhou", e);
      return serverHasNewVersion;
    }
  };

  return { showPrompt, handleUpdate, handleSnooze, checkNow };
}
