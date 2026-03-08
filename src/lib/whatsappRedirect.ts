import { toast } from "sonner";

interface OpenWhatsAppOptions {
  /**
   * 'operational' = order flow, courier notification
   * 'share' = sharing buttons inside dashboard
   */
  mode?: "operational" | "share";
}

/**
 * Opens a WhatsApp URL with robust fallback:
 * 1. Tries window.open (new tab)
 * 2. Shows a manual toast if popup was blocked — NEVER navigates away
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

  // Step 2: toast with manual link — keeps user on page, preserves SPA state
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
