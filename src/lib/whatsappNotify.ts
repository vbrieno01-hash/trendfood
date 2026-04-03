import { openWhatsAppWithFallback } from "./whatsappRedirect";

/**
 * Parse structured notes field to extract customer phone.
 * Format: "TIPO:x|CLIENTE:y|TEL:z|..."
 */
export function parsePhoneFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/TEL:([^|]+)/);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits;
}

/**
 * Parse order type from notes. Returns "Entrega" | "Retirada" | null.
 */
export function parseOrderTypeFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/TIPO:([^|]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Build a WhatsApp message for order accepted and open wa.me link.
 */
export function notifyCustomerWhatsApp(
  phone: string,
  _orderNumber: number | string,
  storeName?: string,
  notes?: string | null,
  loyaltyInfo?: { earned: number; total: number } | null
) {
  const tipo = parseOrderTypeFromNotes(notes ?? null);
  const isDelivery = tipo === "Entrega";

  const loyaltyLine =
    loyaltyInfo && loyaltyInfo.earned > 0
      ? `\n\n🎯 Você ganhou ${loyaltyInfo.earned} ${loyaltyInfo.earned === 1 ? "ponto" : "pontos"} de fidelidade! Saldo: ${loyaltyInfo.total} ${loyaltyInfo.total === 1 ? "ponto" : "pontos"}.`
      : "";

  const msg =
    `🍳 *Pedido aceito!*\n` +
    (isDelivery
      ? `Estamos preparando seu pedido. Avisaremos quando o entregador sair! 😊`
      : `Estamos preparando seu pedido. Avisaremos quando estiver pronto para retirada! 😊`) +
    loyaltyLine +
    (storeName ? `\n\n— ${storeName}` : "");

  const encoded = encodeURIComponent(msg);
  const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const url = `https://wa.me/${fullPhone}?text=${encoded}`;
  openWhatsAppWithFallback(url);
}

/**
 * Build a WhatsApp message for order ready and open wa.me link.
 */
export function notifyCustomerReady(
  phone: string,
  _orderNumber: number | string,
  storeName?: string,
  notes?: string | null,
  reviewUrl?: string
) {
  const tipo = parseOrderTypeFromNotes(notes ?? null);
  const isDelivery = tipo === "Entrega";

  const reviewLine = reviewUrl ? `\n\n⭐ Avalie seu pedido: ${reviewUrl}` : "";

  const msg = isDelivery
    ? `✅ *Pedido saiu para entrega!*\nSeu pedido está a caminho! 🛵` +
      reviewLine +
      (storeName ? `\n\n— ${storeName}` : "")
    : `✅ *Pedido pronto!*\nSeu pedido está pronto para retirada! 🎉` +
      reviewLine +
      (storeName ? `\n\n— ${storeName}` : "");

  const encoded = encodeURIComponent(msg);
  const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const url = `https://wa.me/${fullPhone}?text=${encoded}`;
  openWhatsAppWithFallback(url);
}
