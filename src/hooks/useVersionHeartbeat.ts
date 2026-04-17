import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 min

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
 * Resolve a versão atual do build com fallback robusto.
 * 1) `__BUILD_VERSION__` injetado pelo Vite (build de produção)
 * 2) Hash do bundle JS extraído do DOM (`/assets/index-XXXXX.js`)
 * 3) "unknown" como último recurso
 */
function getBuildVersion(): string {
  try {
    if (typeof __BUILD_VERSION__ !== "undefined" && __BUILD_VERSION__ && __BUILD_VERSION__ !== "unknown") {
      return __BUILD_VERSION__;
    }
  } catch {
    // __BUILD_VERSION__ pode não existir
  }
  try {
    const scripts = Array.from(document.querySelectorAll('script[src*="/assets/"]')) as HTMLScriptElement[];
    for (const s of scripts) {
      const m = s.src.match(/\/assets\/index-([^.]+)\.js/);
      if (m) return `hash-${m[1]}`;
    }
    // fallback: qualquer asset com hash
    for (const s of scripts) {
      const m = s.src.match(/\/assets\/[^/]+-([A-Za-z0-9_-]{6,})\./);
      if (m) return `asset-${m[1]}`;
    }
  } catch {
    // DOM indisponível
  }
  return "unknown";
}

/**
 * Envia um heartbeat agora (uso interno + botão manual no Admin).
 * Retorna detalhes pra debug.
 */
export async function sendVersionHeartbeat(organizationId: string): Promise<{
  ok: boolean;
  version: string;
  error?: string;
}> {
  const version = getBuildVersion();
  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia?.("(display-mode: standalone)").matches === true;
  const userAgent = navigator.userAgent.slice(0, 500);

  console.log(`[heartbeat] enviando v=${version} org=${organizationId} standalone=${isStandalone}`);

  try {
    const { error } = await (supabase.from("store_version_heartbeat") as any).upsert(
      {
        organization_id: organizationId,
        version,
        user_agent: userAgent,
        is_standalone: isStandalone,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

    if (error) {
      console.warn(`[heartbeat] FALHOU: ${error.message}`, error);
      return { ok: false, version, error: error.message };
    }
    console.log(`[heartbeat] OK v=${version}`);
    return { ok: true, version };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[heartbeat] EXCEÇÃO: ${msg}`, err);
    return { ok: false, version, error: msg };
  }
}

/**
 * Envia heartbeat com a versão atual do build para `store_version_heartbeat`.
 * Permite ao admin identificar lojas com cache antigo / SW preso.
 *
 * - Roda 1x ao montar e a cada 30 min se a aba ficar aberta
 * - Skip em preview/iframe
 * - Fail-silent: nunca bloqueia nada
 */
export function useVersionHeartbeat(organizationId: string | undefined | null) {
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!organizationId) return;
    if (isPreviewHost || isInIframe) {
      console.log("[heartbeat] skip (preview/iframe)");
      return;
    }

    const send = async () => {
      const result = await sendVersionHeartbeat(organizationId);
      if (result.ok) lastSentRef.current = Date.now();
    };

    // 1x ao montar
    send();

    // Repete a cada 30min
    const id = setInterval(send, HEARTBEAT_INTERVAL_MS);

    // Re-envia ao voltar para a aba se passou tempo suficiente
    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastSentRef.current > HEARTBEAT_INTERVAL_MS
      ) {
        send();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [organizationId]);
}
