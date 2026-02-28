

# Plano: Remover seção de Assinatura das Configurações e edge functions da Cakto

## Alterações

### 1. `src/components/dashboard/SettingsTab.tsx`
- Remover o bloco "Assinatura" (seção com ícone CreditCard, "Plano atual", botão "Trocar plano"/"Fazer upgrade")
- Remover imports não utilizados: `CreditCard`, `Zap`, `useNavigate` (se não usado em outro lugar)
- A gestão de assinatura já é feita pela aba dedicada (SubscriptionTab) com pagamento direto por cartão/PIX via Mercado Pago

### 2. Remover edge functions da Cakto
- Deletar `supabase/functions/cakto-webhook-pro/index.ts`
- Deletar `supabase/functions/cakto-webhook-enterprise/index.ts`
- O webhook universal (`universal-activation-webhook`) continua disponível para qualquer gateway externa, caso necessário

### 3. Referências Cakto em Admin (manter)
- `PlansConfigSection.tsx` e `ActivationLogsTab.tsx` mencionam "Cakto" apenas como texto de placeholder/exemplo — não são dependências funcionais, podem permanecer como referência genérica

