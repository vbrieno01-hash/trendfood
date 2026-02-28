const MP_ERROR_MAP: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo insuficiente no cartão",
  cc_rejected_bad_filled_card_number: "Número do cartão inválido",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) inválido",
  cc_rejected_bad_filled_date: "Data de validade inválida",
  cc_rejected_high_risk: "Pagamento recusado por medida de segurança. Tente outro cartão ou pague via PIX.",
  cc_rejected_call_for_authorize: "Cartão requer autorização. Ligue para o banco.",
  cc_rejected_card_disabled: "Cartão desabilitado. Ligue para o banco.",
  cc_rejected_max_attempts: "Limite de tentativas atingido. Tente outro cartão.",
  cc_rejected_duplicated_payment: "Pagamento duplicado. Verifique seus extratos.",
  cc_rejected_other_reason: "Pagamento recusado. Verifique os dados e tente novamente.",
  "Card token service not found": "Erro ao processar cartão. Tente novamente ou use outro cartão.",
  "card_token_service_not_found": "Erro ao processar cartão. Tente novamente ou use outro cartão.",
  "CC_VAL_433": "Erro de validação do cartão. Verifique os dados e tente novamente.",
};

const DEFAULT_MSG = "Pagamento recusado. Verifique os dados e tente novamente.";

export function getMpErrorMessage(statusDetail?: string | null): string {
  if (!statusDetail) return DEFAULT_MSG;
  if (MP_ERROR_MAP[statusDetail]) return MP_ERROR_MAP[statusDetail];
  if (statusDetail.includes("CC_VAL") || statusDetail.includes("card_token"))
    return "Erro ao processar cartão. Verifique os dados e tente novamente.";
  return DEFAULT_MSG;
}
