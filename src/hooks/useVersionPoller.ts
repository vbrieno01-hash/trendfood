import { useEffect, useRef, useState, useCallback } from "react";

const POLL_INTERVAL_MS = 60 * 1000; // 60s

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
 * Extrai um "fingerprint" do index.html publicado.
 * Concatena os src/href de scripts e stylesheets do <head>.
 * Qualquer mudança no bundle gera fingerprint diferente.
 */
function extractFingerprint(html: string): string {
  const matches = html.match(/(?:src|href)="\/assets\/[^"]+"/g) || [];
  return matches.sort().join("|");
}

async function fetchCurrentFingerprint(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const fp = extractFingerprint(html);
    return fp || null;
  } catch (e) {
    console.info("[VersionPoller] fetch falhou", e);
    return null;
  }
}

/**
 * Detecta nova versão publicada **independente do Service Worker**.
 * Faz polling de /index.html e compara o hash dos assets.
 *
 * Retorna `hasNewVersion` (estado reativo) e `checkNow` (verificação manual síncrona).
 */
export function useVersionPoller(): {
  hasNewVersion: boolean;
  checkNow: () => Promise<boolean>;
} {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const initialFpRef = useRef<string | null>(null);
  const initialFpReadyRef = useRef<Promise<void> | null>(null);

  // Verificação manual: faz fetch agora, compara, retorna boolean direto.
  const checkNow = useCallback(async (): Promise<boolean> => {
    if (isPreviewHost || isInIframe) {
      console.info("[VersionPoller] checkNow ignorado (preview/iframe)");
      return false;
    }

    // Garante que o fingerprint inicial já foi capturado
    if (initialFpReadyRef.current) {
      await initialFpReadyRef.current;
    }

    const current = await fetchCurrentFingerprint();
    const initial = initialFpRef.current;
    const changed = !!(initial && current && current !== initial);

    console.info(
      "[VersionPoller] checkNow →",
      "inicial:", initial?.slice(0, 60),
      "| atual:", current?.slice(0, 60),
      "| mudou:", changed
    );

    if (changed) setHasNewVersion(true);
    return changed;
  }, []);

  useEffect(() => {
    if (isPreviewHost || isInIframe) return;

    let cancelled = false;

    // Captura fingerprint inicial e expõe a promise pra checkNow esperar
    initialFpReadyRef.current = (async () => {
      const fp = await fetchCurrentFingerprint();
      if (cancelled) return;
      initialFpRef.current = fp;
      console.info("[VersionPoller] fingerprint inicial:", fp?.slice(0, 80));
    })();

    const check = async () => {
      if (cancelled) return;
      const current = await fetchCurrentFingerprint();
      const initial = initialFpRef.current;
      if (cancelled || !current) return;
      if (initial && current !== initial) {
        console.info("[VersionPoller] NOVA VERSÃO detectada via index.html");
        setHasNewVersion(true);
      }
    };

    const id = setInterval(check, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, []);

  return { hasNewVersion, checkNow };
}
