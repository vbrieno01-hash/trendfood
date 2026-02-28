

# Checkout Transparente: PIX + Erros detalhados no cartão

## Contexto
O backend já possui `create-mp-payment` (suporta PIX e cartão) e `check-subscription-pix` (polling de status). O frontend precisa ser atualizado para expor a opção PIX e melhorar mensagens de erro.

## Implementação

### 1. Refatorar `CardPaymentForm.tsx` para suportar abas Cartão/PIX
- Adicionar `Tabs` com duas abas: "Cartão de crédito" e "PIX"
- Aba Cartão: formulário atual (sem mudanças estruturais)
- Aba PIX: campo CPF/CNPJ → chama `create-mp-payment` com `payment_method: "pix"` → exibe QR Code + Copia e Cola → polling via `check-subscription-pix` a cada 5s
- Ao confirmar PIX (polling retorna `paid: true`), mostra toast de sucesso e chama `onSuccess`

### 2. Adicionar mapeamento de erros em português para cartão
- Mapear `status_detail` do Mercado Pago para mensagens amigáveis:
  - `cc_rejected_insufficient_amount` → "Saldo insuficiente no cartão"
  - `cc_rejected_bad_filled_card_number` → "Número do cartão inválido"
  - `cc_rejected_bad_filled_security_code` → "Código de segurança (CVV) inválido"
  - `cc_rejected_bad_filled_date` → "Data de validade inválida"
  - `cc_rejected_high_risk` → "Pagamento recusado por medida de segurança"
  - `cc_rejected_call_for_authorize` → "Cartão requer autorização. Ligue para o banco."
  - `cc_rejected_card_disabled` → "Cartão desabilitado. Ligue para o banco."
  - `cc_rejected_max_attempts` → "Limite de tentativas atingido. Tente outro cartão."
  - Demais → "Pagamento recusado. Verifique os dados e tente novamente."
- Exibir no catch do `handleSubmit` com `toast.error` usando a mensagem mapeada

### 3. Fluxo PIX dentro do modal
- Ao submeter PIX, chama `create-mp-payment` → recebe `pix_qr_code`, `pix_qr_code_base64`, `payment_id`
- Renderiza QR Code usando `QRCodeSVG` ou imagem base64
- Mostra "Copia e Cola" com botão copiar
- Inicia polling com `setInterval` chamando `check-subscription-pix` a cada 5 segundos
- Countdown de 10 minutos para expiração
- Quando `paid: true`, toast de sucesso + `onSuccess()`

### Detalhes técnicos
- Reutiliza edge functions existentes (`create-mp-payment`, `check-subscription-pix`) — sem alteração no backend
- O `create-mp-subscription` continua como fluxo principal de cartão com assinatura recorrente
- PIX no checkout de assinatura será pagamento avulso (mensal manual ou single payment) via `create-mp-payment`, não recorrente — pois a API de preapproval do MP não suporta PIX automático
- Ao pagar PIX, o plano é ativado por 30 dias (mesma lógica já existente em `check-subscription-pix`)

