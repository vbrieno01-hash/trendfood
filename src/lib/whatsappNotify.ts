/**
 * Parse structured notes field to extract customer phone.
 * Format: "TIPO:x|CLIENTE:y|TEL:z|..."
 */
export function parsePhoneFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/TEL:([^|]+)/);
  if (!match) return null;
  // Clean: keep only digits
  const digits = match[1].replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits;
}

/**
 * Build a WhatsApp message for order status change and open wa.me link.
 */
export function notifyCustomerWhatsApp(
  phone: string,
  orderNumber: number | string,
  storeName?: string
) {
  const msg =
    `🍳 *Pedido #${orderNumber} aceito!*\n` +
    `Seu pedido está sendo preparado com carinho. Avisaremos quando estiver pronto! 😊` +
    (storeName ? `\n\n— ${storeName}` : "");

  const encoded = encodeURIComponent(msg);
  // Ensure country code (Brazil = 55)
  const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const url = `https://wa.me/${fullPhone}?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
