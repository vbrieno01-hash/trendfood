

# Plano: Página de Gerenciamento de Assinatura com Mercado Pago

## Pré-requisito: API Key do Mercado Pago

O checkout transparente do Mercado Pago requer duas credenciais:
- **Public Key** (usada no frontend para o SDK JS) — pode ser armazenada no código
- **Access Token** (usada no backend para criar pagamentos) — precisa ser adicionada como secret

Antes de implementar, será necessário solicitar ao usuário o `MERCADO_PAGO_ACCESS_TOKEN` e o `MERCADO_PAGO_PUBLIC_KEY`.

## Arquivos a criar/editar

### 1) Secret: `MERCADO_PAGO_ACCESS_TOKEN`
Adicionar via tool `add_secret` para uso na edge function.

### 2) Edge Function: `supabase/functions/create-mp-payment/index.ts`
- Recebe: `org_id`, `plan` (pro/enterprise), `cpf_cnpj`, `payment_method` (pix/card), dados do cartão se aplicável
- Valida o usuário autenticado e que ele é dono da org
- Cria pagamento via API Mercado Pago (`/v1/payments`)
  - PIX: retorna `qr_code` e `qr_code_base64`
  - Cartão: usa token gerado pelo SDK frontend
- Retorna status do pagamento e dados PIX se aplicável

### 3) Edge Function: `supabase/functions/mp-webhook/index.ts`
- Recebe notificações IPN/webhook do Mercado Pago
- Quando pagamento aprovado, atualiza `organizations.subscription_plan` e `subscription_status`
- Define `trial_ends_at` como +30 dias (expiração da assinatura)
- Registra na tabela `activation_logs`

### 4) Componente: `src/components/dashboard/SubscriptionTab.tsx`
Nova aba no dashboard do lojista com:
- Cards dos 3 planos (Grátis R$0, Pro R$99, Enterprise R$249) usando `PlanCard`
- Identificação automática da loja: "Assinando para: {nome_da_loja}"
- Plano atual destacado com badge "Seu plano"
- Ao selecionar plano pago, abre formulário inline:
  - Campo CPF/CNPJ com máscara
  - Seleção PIX ou Cartão (RadioGroup)
  - Se PIX: botão "Gerar PIX" → chama edge function → mostra QR Code real
  - Se Cartão: campos do SDK Mercado Pago (cardForm) inline
- Botão "Pagar" que processa via edge function
- Após aprovação, realtime listener já existente no `useAuth` atualiza o plano automaticamente

### 5) Editar: `src/pages/DashboardPage.tsx`
- Adicionar tab "Assinatura" no menu lateral do dashboard
- Renderizar `SubscriptionTab` quando selecionada

### 6) Atualizar `supabase/config.toml`
- Configurar `verify_jwt = false` para `mp-webhook` (webhook público)
- Configurar `verify_jwt = false` para `create-mp-payment` (validação manual no código)

## Design
- Cores Trendfood (primary vermelho/laranja)
- Mobile-first, responsivo
- Cards de plano com destaque no Pro (highlighted)
- Formulário limpo com Labels e ícones Lucide

## Fluxo resumido

```text
Lojista abre aba Assinatura
  → Vê 3 cards de plano
  → Clica "Assinar Pro"
  → Formulário: CPF/CNPJ + PIX/Cartão
  → Clica "Pagar"
  → Edge function cria pagamento no MP
  → Se PIX: mostra QR Code
  → Se Cartão: processa imediato
  → Webhook MP confirma → atualiza DB
  → Realtime notifica frontend → toast "Plano atualizado!"
```

