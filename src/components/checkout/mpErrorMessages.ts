const MP_ERROR_MAP: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo insuficiente no cartão",
  cc_rejected_bad_filled_card_number: "Número do cartão inválido",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) inválido",
  cc_rejected_bad_filled_date: "Data de validade inválida",
  cc_rejected_high_risk: "Pagamento recusado por medida de segurança",
  cc_rejected_call_for_authorize: "Cartão requer autorização. Ligue para o banco.",
  cc_rejected_card_disabled: "Cartão desabilitado. Ligue para o banco.",
  cc_rejected_max_attempts: "Limite de tentativas atingido. Tente outro cartão.",
  cc_rejected_duplicated_payment: "Pagamento duplicado. Verifique seus extratos.",
  cc_rejected_other_reason: "Pagamento recusado. Verifique os dados e tente novamente.",
  "Card token service not found": "Erro de credenciais de teste. Use cartões de teste do Mercado Pago ou troque para credenciais de produção.",
  "card_token_service_not_found": "Erro de credenciais de teste. Use cartões de teste do Mercado Pago ou troque para credenciais de produção.",
  "CC_VAL_433": "Erro de validação do cartão. Se estiver em ambiente de teste, use cartões de teste do Mercado Pago.",
};

const DEFAULT_MSG = "Pagamento recusado. Verifique os dados e tente novamente.";
const TEST_ENV_MSG = "Erro de validação do cartão. Se estiver em ambiente de teste, use cartões de teste do Mercado Pago.";

export function getMpErrorMessage(statusDetail?: string | null): string {
  if (!statusDetail) return DEFAULT_MSG;
  if (MP_ERROR_MAP[statusDetail]) return MP_ERROR_MAP[statusDetail];
  if (statusDetail.includes("CC_VAL") || statusDetail.includes("card_token")) return TEST_ENV_MSG;
  return DEFAULT_MSG;
}
