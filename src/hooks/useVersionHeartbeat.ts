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
 * Envia heartbeat com a versão atual do build para `store_version_heartbeat`.
 * Permite ao admin identificar lojas com cache antigo / SW preso.
 *
 * - Roda 1x ao montar e a cada 30 min se a aba ficar aberta
 * - Skip em preview/iframe
 * - Fail-silent: nunca bloqueia nada
 */
export function useVersionHeartbeat(organizationId: string | undefined) {
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!organizationId) return;
    if (isPreviewHost || isInIframe) return;

    const send = async () => {
      try {
        const version =
          typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "unknown";
        const isStandalone =
          typeof window !== "undefined" &&
          window.matchMedia?.("(display-mode: standalone)").matches === true;
        const userAgent = navigator.userAgent.slice(0, 500);

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
          console.info("[heartbeat] erro (não-bloqueante):", error.message);
        } else {
          lastSentRef.current = Date.now();
        }
      } catch (err) {
        console.info("[heartbeat] exceção (não-bloqueante):", err);
      }
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
