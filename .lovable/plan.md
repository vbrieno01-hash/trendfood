

# Simplificar pagamento: apenas Mercado Pago

O sistema atualmente referencia Cakto, Kiwify, Hotmart e outros gateways externos em vários lugares. Vamos limpar tudo e deixar só Mercado Pago.

## Alterações

### 1. `src/pages/PricingPage.tsx` — Redirecionar para checkout interno
- `handleConfirmPlan`: em vez de abrir `checkout_url` externo, redirecionar para a aba de assinatura no dashboard (`/dashboard?tab=assinatura&plan=pro`)
- Atualizar texto do dialog para mencionar que o pagamento será via PIX ou cartão (Mercado Pago)

### 2. `src/components/admin/PlansConfigSection.tsx` — Remover campos de gateway externo
- Remover campo "Checkout URL" (placeholder "https://pay.cakto.com.br/...")
- Remover campo "Webhook Secret Name" (placeholder "CAKTO_WEBHOOK_SECRET_PRO")

### 3. `src/components/admin/ActivationLogsTab.tsx` — Limpar referências
- Remover menção a "Cakto, Kiwify, Hotmart, Eduzz, Monetizze, Stripe" na descrição do webhook universal
- Atualizar texto para algo genérico tipo "Compatível com webhooks externos"

### 4. Manter o que já funciona
- Edge functions `create-mp-payment`, `mp-webhook`, `check-subscription-pix` — já estão 100% Mercado Pago
- `SubscriptionTab` — já usa Mercado Pago direto, sem mudanças
- `universal-activation-webhook` — manter como fallback para ativação manual do admin, só limpar textos

