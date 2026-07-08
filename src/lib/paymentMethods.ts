/**
 * Métodos de pagamento canônicos do Trendfood.
 * Estes valores são gravados em `orders.payment_method` e mapeados
 * pelo `fiscal-emit-nfce` para os códigos SEFAZ da NFC-e.
 *
 * Mapeamento SEFAZ (spec Focus NFe v2 — `forma_pagamento`):
 *   01 = Dinheiro
 *   02 = Cheque
 *   03 = Cartão de Crédito
 *   04 = Cartão de Débito
 *   05 = Vale Alimentação
 *   10 = Vale Refeição
 *   17 = PIX
 *   99 = Outros
 */

export type PaymentMethod =
  | "pix"
  | "cash"
  | "card_credit"
  | "card_debit"
  | "meal_voucher"
  | "food_voucher"
  | "check"
  | "other"
  | "pending";

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "pix",
  "cash",
  "card_credit",
  "card_debit",
  "meal_voucher",
  "food_voucher",
  "check",
  "other",
  "pending",
] as const;

/** Rótulo humano em pt-BR. */
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card_credit: "Cartão de Crédito",
  card_debit: "Cartão de Débito",
  meal_voucher: "Vale Refeição",
  food_voucher: "Vale Alimentação",
  check: "Cheque",
  other: "Outros",
  pending: "Aguardando pagamento",
};

/** Código SEFAZ (`forma_pagamento` NFC-e). */
export const PAYMENT_SEFAZ_CODE: Record<PaymentMethod, "01" | "02" | "03" | "04" | "05" | "10" | "17" | "99"> = {
  pix: "17",
  cash: "01",
  card_credit: "03",
  card_debit: "04",
  meal_voucher: "10",
  food_voucher: "05",
  check: "02",
  other: "99",
  pending: "99",
};

/**
 * Normaliza uma string vinda da UI antiga ("PIX", "Dinheiro", "Cartão", etc.)
 * para a chave canônica. Retorna "other" quando não reconhecido.
 */
export function normalizePaymentMethod(input?: string | null): PaymentMethod {
  const s = (input || "").toLowerCase().trim();
  if (!s || s === "pending") return "pending";
  if (s.includes("pix")) return "pix";
  if (s.includes("dinh") || s === "cash" || s.includes("espec")) return "cash";
  if (s.includes("credit") || s === "card_credit" || s.includes("crédit")) return "card_credit";
  if (s.includes("deb") || s === "card_debit") return "card_debit";
  if (s.includes("refei") || s === "meal_voucher") return "meal_voucher";
  if (s.includes("alimen") || s === "food_voucher") return "food_voucher";
  if (s.includes("cheque") || s === "check") return "check";
  return "other";
}

/** Mapeia diretamente para o código SEFAZ, aceitando qualquer string de entrada. */
export function paymentMethodToSefaz(input?: string | null): "01" | "02" | "03" | "04" | "05" | "10" | "17" | "99" {
  return PAYMENT_SEFAZ_CODE[normalizePaymentMethod(input)];
}
