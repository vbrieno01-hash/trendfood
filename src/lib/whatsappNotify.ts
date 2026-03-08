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
  notes?: string | null
) {
  const tipo = parseOrderTypeFromNotes(notes ?? null);
  const isDelivery = tipo === "Entrega";

  const msg =
    `🍳 *Pedido aceito!*\n` +
    (isDelivery
      ? `Estamos preparando seu pedido. Avisaremos quando o entregador sair! 😊`
      : `Estamos preparando seu pedido. Avisaremos quando estiver pronto para retirada! 😊`) +
    (storeName ? `\n\n— ${storeName}` : "");

  const encoded = encodeURIComponent(msg);
  const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const url = `https://wa.me/${fullPhone}?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Build a WhatsApp message for order ready and open wa.me link.
 */
export function notifyCustomerReady(
  phone: string,
  _orderNumber: number | string,
  storeName?: string,
  notes?: string | null
) {
  const tipo = parseOrderTypeFromNotes(notes ?? null);
  const isDelivery = tipo === "Entrega";

  const msg = isDelivery
    ? `✅ *Pedido saiu para entrega!*\nSeu pedido está a caminho! 🛵` +
      (storeName ? `\n\n— ${storeName}` : "")
    : `✅ *Pedido pronto!*\nSeu pedido está pronto para retirada! 🎉` +
      (storeName ? `\n\n— ${storeName}` : "");

  const encoded = encodeURIComponent(msg);
  const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const url = `https://wa.me/${fullPhone}?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
