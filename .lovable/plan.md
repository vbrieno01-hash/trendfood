

# Checkout Transparente — Formulário de cartão na própria página

Sim, a assinatura continua sendo **automática e recorrente**. A diferença é que em vez de redirecionar para o site do Mercado Pago, o cliente preenche o cartão direto na sua página. O MP continua cobrando automaticamente todo mês.

## Implementação

### 1. Criar `src/components/checkout/CardPaymentForm.tsx`
- Modal (Dialog) com formulário de cartão: número, titular, validade, CVV, CPF
- Ao montar, busca public key via `get-mp-public-key` e carrega SDK `https://sdk.mercadopago.com/js/v2`
- Usa `new MercadoPago(publicKey)` + `mp.createCardToken()` para tokenizar o cartão client-side
- Ao submeter, chama `create-mp-subscription` passando `card_token_id` + `org_id` + `plan`
- Se sucesso, mostra toast e recarrega; se erro, permite tentar novamente
- Visual com a marca TrendFood, sem referência visual ao MP

### 2. Atualizar `create-mp-subscription` edge function
- Aceitar campo opcional `card_token_id` no body
- Se presente, criar preapproval com `card_token_id` e `status: "authorized"` (ativa imediatamente, sem redirect)
- Se ausente, manter fluxo atual (redirect) como fallback
- Snippet da mudança no body do preapproval:
```typescript
const preapprovalBody = {
  ...existingFields,
  ...(card_token_id ? { card_token_id, status: "authorized" } : { status: "pending" }),
};
```

### 3. Atualizar `SubscriptionTab.tsx`
- Ao clicar em "Assinar Pro/Enterprise", abrir modal `CardPaymentForm` em vez de redirecionar
- Passar `org_id`, `plan` e callback de sucesso ao componente
- Remover o redirect para `init_point` quando o checkout transparente é usado

### 4. Atualizar `PricingPage.tsx`
- Mesma lógica: abrir modal `CardPaymentForm` em vez de redirecionar

