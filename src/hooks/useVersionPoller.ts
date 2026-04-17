import { useEffect, useState } from "react";

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
  // Pega todos os src e href de scripts/links — em build com hash, mudam a cada deploy
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
 */
export function useVersionPoller(): boolean {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    if (isPreviewHost || isInIframe) return;

    let initialFp: string | null = null;
    let cancelled = false;

    // Captura fingerprint inicial
    fetchCurrentFingerprint().then((fp) => {
      if (cancelled) return;
      initialFp = fp;
      console.info("[VersionPoller] fingerprint inicial:", fp?.slice(0, 80));
    });

    const check = async () => {
      const current = await fetchCurrentFingerprint();
      if (cancelled || !current) return;
      if (initialFp && current !== initialFp) {
        console.info("[VersionPoller] NOVA VERSÃO detectada via index.html");
        setHasNewVersion(true);
      }
    };

    const id = setInterval(check, POLL_INTERVAL_MS);

    // Também checa em foco/visibility
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

  return hasNewVersion;
}
