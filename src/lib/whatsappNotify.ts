import { openWhatsAppWithFallback } from "./whatsappRedirect";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tenta enviar mensagem via bot (uazapi) automaticamente. Se não der (bot desligado,
 * sem instância, ou erro), abre wa.me como fallback.
 */
async function sendOrFallback(
  phone: string,
  message: string,
  organizationId?: string | null,
) {
  const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;

  if (organizationId) {
    try {
      const { data } = await supabase.functions.invoke("whatsapp-send-auto", {
        body: { organization_id: organizationId, phone, message },
      });
      if (data?.sent) return;
    } catch (e) {
      console.warn("[whatsappNotify] auto send failed, falling back to wa.me", e);
    }
  }
  openWhatsAppWithFallback(url);
}

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
 * Parse scheduled time from notes. Returns "HH:mm" or null.
 */
export function parseScheduledTimeFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/AGENDADO:([^|]+)/);
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
  loyaltyInfo?: { earned: number; total: number } | null,
  organizationId?: string | null,
) {
  const tipo = parseOrderTypeFromNotes(notes ?? null);
  const isDelivery = tipo === "Entrega";

  const loyaltyLine =
    loyaltyInfo && loyaltyInfo.earned > 0
      ? `\n\n🎯 Você ganhou ${loyaltyInfo.earned} ${loyaltyInfo.earned === 1 ? "ponto" : "pontos"} de fidelidade! Saldo: ${loyaltyInfo.total} ${loyaltyInfo.total === 1 ? "ponto" : "pontos"}.`
      : "";

  const scheduledTime = parseScheduledTimeFromNotes(notes ?? null);
  const scheduledLine = scheduledTime
    ? `\n\n🕐 Pedido agendado para *${scheduledTime}*.`
    : "";

  const msg =
    `🍳 *Pedido aceito!*\n` +
    (isDelivery
      ? `Estamos preparando seu pedido. Avisaremos quando o entregador sair! 😊`
      : `Estamos preparando seu pedido. Avisaremos quando estiver pronto para retirada! 😊`) +
    scheduledLine +
    loyaltyLine +
    (storeName ? `\n\n— ${storeName}` : "");

  void sendOrFallback(phone, msg, organizationId);
}

/**
 * Build a WhatsApp message for order ready and open wa.me link.
 */
export function notifyCustomerReady(
  phone: string,
  _orderNumber: number | string,
  storeName?: string,
  notes?: string | null,
  reviewUrl?: string,
  organizationId?: string | null,
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

  void sendOrFallback(phone, msg, organizationId);
}
