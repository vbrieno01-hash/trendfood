

## Plano: Processar bônus de indicação em TODAS as formas de ativação

### Problema
O bônus de +10 dias para quem indicou **só é processado** quando a ativação vem pelo webhook do Mercado Pago. As seguintes fontes de ativação **não concedem o bônus**:
- Ativação rápida pelo admin (botão "Ativar Pro 30d")
- Gerenciamento manual de assinatura (ManageSubscriptionDialog)
- Webhook universal (usado por gateways externos)

### Solução

#### 1. `supabase/functions/universal-activation-webhook/index.ts`
Adicionar a função `processReferralBonus` (mesma lógica do mp-webhook, sem a parte do Mercado Pago billing):
- Verificar `referred_by_id` da org ativada
- Checar duplicidade em `referral_bonuses`
- Inserir bônus de 10 dias
- Somar +10 dias ao `trial_ends_at` do indicador
- Registrar em `activation_logs`
- Chamar após a ativação da org

#### 2. `src/pages/AdminPage.tsx` (função `quickActivate`)
Após ativar a org, adicionar lógica para:
- Buscar `referred_by_id` da org ativada
- Se existir, verificar se bônus já foi concedido
- Inserir em `referral_bonuses` e somar +10 dias ao `trial_ends_at` do indicador

#### 3. `src/components/admin/ManageSubscriptionDialog.tsx`
Quando o status mudar para "active" e o plano for pago (pro/enterprise/lifetime), executar a mesma lógica de bônus de indicação.

#### 4. Correção manual pendente
Executar SQL para creditar os +10 dias à org "MCD" pela indicação da "teste1" (inserir em `referral_bonuses` e atualizar `trial_ends_at`).

