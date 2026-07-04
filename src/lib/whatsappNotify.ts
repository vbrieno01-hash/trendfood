import { openWhatsAppWithFallback } from "./whatsappRedirect";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna true se a loja tem uma instância WhatsApp conectada. Quando true,
 * o outbox no servidor cuida do envio — não abrimos wa.me manual pra não duplicar.
 * Fail-open: em qualquer erro, retorna false pra garantir que o cliente é avisado.
 */
export async function hasActiveWhatsAppBot(organizationId: string): Promise<boolean> {
  try {
    const { data: inst } = await supabase
      .from("whatsapp_instances")
      .select("status")
      .eq("organization_id", organizationId)
      .in("status", ["connected", "open"])
      .maybeSingle();
    return !!inst;
  } catch {
    return false;
  }
}

/**
 * Abre wa.me manual APENAS quando não há robô ativo. Se o robô está ativo,
 * o outbox no servidor já disparou — não faz nada aqui pra evitar mensagem duplicada.
 */
async function openManualIfNoBot(
  phone: string,
  message: string,
  organizationId?: string | null,
) {
  if (organizationId) {
    const botActive = await hasActiveWhatsAppBot(organizationId);
    if (botActive) return;
  }
  const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
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
 * Notifica o cliente que o pedido foi aceito e está sendo preparado.
 * Só dispara wa.me se a loja NÃO tem robô automático — quando tem, o outbox no
 * servidor cuida (e abrir wa.me aqui geraria mensagem duplicada).
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

  void openManualIfNoBot(phone, msg, organizationId);
}

/**
 * Notifica o cliente que o pedido está pronto (ou saiu para entrega).
 * Mesma regra: só cai no wa.me manual quando a loja não tem robô ativo.
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

  void openManualIfNoBot(phone, msg, organizationId);
}
