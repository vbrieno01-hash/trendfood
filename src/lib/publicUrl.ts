/**
 * Retorna a URL pública base do app.
 *
 * Usado para gerar links que sairão do app (QR codes, WhatsApp, e-mails, push)
 * e que precisam continuar funcionando mesmo após migração de hospedagem
 * (Lovable -> Vercel/outro).
 *
 * Ordem de prioridade:
 * 1. VITE_PUBLIC_BASE_URL (defina em produção: https://trendfood.site)
 * 2. window.location.origin (browser)
 * 3. https://trendfood.lovable.app (fallback final em SSR/build)
 *
 * Sempre retorna sem barra no final.
 */
export function getPublicBaseUrl(): string {
  const fromEnv = import.meta.env?.VITE_PUBLIC_BASE_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "https://trendfood.lovable.app";
}

/**
 * URL de marca — SEMPRE o domínio oficial, independente de onde o app roda.
 * Use em links compartilhados publicamente (indicação, marketing, redes sociais)
 * para nunca vazar hosts feios tipo "preview--...lovable.app".
 */
const BRAND_URL = "https://trendfood.site";

export function getShareableBaseUrl(): string {
  return BRAND_URL;
}

export function shareableUrl(path = "/"): string {
  if (!path) return BRAND_URL;
  return `${BRAND_URL}/${path.replace(/^\/+/, "")}`;
}

/**
 * Concatena um caminho à URL pública base, normalizando barras.
 */
export function publicUrl(path = "/"): string {
  const base = getPublicBaseUrl();
  if (!path) return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
}

/**
 * Host (sem protocolo) da URL pública. Útil para mensagens ao usuário.
 * Ex: "trendfood.site"
 */
export function getPublicHost(): string {
  try {
    return new URL(getPublicBaseUrl()).host;
  } catch {
    return "trendfood.lovable.app";
  }
}