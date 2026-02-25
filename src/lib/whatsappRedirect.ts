import { toast } from "sonner";

/**
 * Detects if the current window is inside an iframe or restricted context
 * where navigation to external URLs (like api.whatsapp.com) is likely to be blocked.
 */
function isEmbeddedOrRestrictedContext(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin iframe — definitely restricted
    return true;
  }
}

interface OpenWhatsAppOptions {
  /**
   * 'operational' = order flow, courier notification — may try location.href in non-restricted contexts
   * 'share' = sharing buttons inside dashboard — never navigate away
   */
  mode?: "operational" | "share";
}

/**
 * Opens a WhatsApp URL with robust fallback:
 * 1. Tries window.open (new tab)
 * 2. If in unrestricted context + operational mode → tries location.href
 * 3. Always shows a manual toast if automatic methods fail
 */
export function openWhatsAppWithFallback(url: string, options: OpenWhatsAppOptions = {}): void {
  const { mode = "operational" } = options;
  const restricted = isEmbeddedOrRestrictedContext();

  // Step 1: try window.open
  let opened = false;
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) opened = true;
  } catch {
    // blocked by popup blocker
  }

  if (opened) return;

  // Step 2: only try location.href in non-restricted, operational contexts
  if (!restricted && mode === "operational") {
    try {
      window.location.href = url;
      return;
    } catch {
      // fall through to manual toast
    }
  }

  // Step 3: always show manual fallback toast
  toast.info("O navegador bloqueou a abertura automática.", {
    description: "Toque no botão abaixo para abrir o WhatsApp.",
    action: {
      label: "Abrir WhatsApp",
      onClick: () => {
        window.open(url, "_blank");
      },
    },
    duration: 30000,
  });
}
