import { useEffect, useRef, useState, useCallback } from "react";

const POLL_INTERVAL_MS = 60 * 1000; // 60s
const LAST_SEEN_FP_KEY = "pwa_last_seen_fp";

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
 * Persiste o fingerprint visto em sessões anteriores no localStorage,
 * permitindo detectar deploys que aconteceram entre sessões — assim que
 * o app monta, compara o snapshot antigo (persistido) com o atual.
 *
 * Retorna `hasNewVersion`, `currentFingerprint` (estado reativo) e
 * `checkNow` (verificação manual síncrona).
 */
export function useVersionPoller(): {
  hasNewVersion: boolean;
  currentFingerprint: string | null;
  checkNow: () => Promise<boolean>;
} {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [currentFingerprint, setCurrentFingerprint] = useState<string | null>(null);
  const initialFpRef = useRef<string | null>(null);
  const initialFpReadyRef = useRef<Promise<void> | null>(null);

  // Verificação manual: faz fetch agora, compara, retorna boolean direto.
  const checkNow = useCallback(async (): Promise<boolean> => {
    if (isPreviewHost || isInIframe) {
      console.info("[VersionPoller] checkNow ignorado (preview/iframe)");
      return false;
    }

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

    if (current) setCurrentFingerprint(current);
    if (changed) setHasNewVersion(true);
    return changed;
  }, []);

  useEffect(() => {
    if (isPreviewHost || isInIframe) return;

    let cancelled = false;

    initialFpReadyRef.current = (async () => {
      // 1) Recupera fingerprint persistido de sessão anterior
      let persistedFp: string | null = null;
      try {
        persistedFp = localStorage.getItem(LAST_SEEN_FP_KEY);
      } catch {}

      // 2) Captura fingerprint atual do servidor
      const currentFp = await fetchCurrentFingerprint();
      if (cancelled) return;

      console.info(
        "[VersionPoller] boot →",
        "persistido:", persistedFp?.slice(0, 60) || "(nenhum)",
        "| atual:", currentFp?.slice(0, 60)
      );

      if (currentFp) {
        setCurrentFingerprint(currentFp);

        // 3) Se já tinha snapshot anterior e mudou → nova versão na hora
        if (persistedFp && persistedFp !== currentFp) {
          console.info("[VersionPoller] NOVA VERSÃO detectada no boot (snapshot persistido difere)");
          initialFpRef.current = persistedFp; // mantém o antigo como referência
          setHasNewVersion(true);
        } else {
          // Primeira sessão OU mesma versão → adota o atual como baseline
          initialFpRef.current = currentFp;
          try {
            localStorage.setItem(LAST_SEEN_FP_KEY, currentFp);
          } catch {}
        }
      }
    })();

    const check = async (trigger: string) => {
      if (cancelled) return;
      const current = await fetchCurrentFingerprint();
      const initial = initialFpRef.current;
      if (cancelled || !current) return;
      if (current) setCurrentFingerprint(current);
      const changed = !!(initial && current !== initial);
      console.info(
        `[VersionPoller] ${trigger} →`,
        "inicial:", initial?.slice(0, 60),
        "| atual:", current?.slice(0, 60),
        "| mudou:", changed
      );
      if (changed) {
        console.info("[VersionPoller] NOVA VERSÃO detectada via index.html");
        setHasNewVersion(true);
      }
    };

    const id = setInterval(() => check("tick (60s)"), POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") check("visibility/focus");
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

  return { hasNewVersion, currentFingerprint, checkNow };
}
