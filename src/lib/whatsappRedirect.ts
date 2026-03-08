import { toast } from "sonner";

/**
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
export function openWhatsAppWithFallback(url: string, _options: OpenWhatsAppOptions = {}): void {
  // Step 1: try window.open
  let opened = false;
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) opened = true;
  } catch {
    // blocked by popup blocker
  }

  if (opened) return;

  // Step 2: NEVER use location.href — it navigates away and destroys SPA state.
  // Always show a manual fallback toast so the user stays on the page.
  toast.info("Toque no botão abaixo para abrir o WhatsApp.", {
    action: {
      label: "Abrir WhatsApp",
      onClick: () => {
        window.open(url, "_blank");
      },
    },
    duration: 30000,
  });
}
