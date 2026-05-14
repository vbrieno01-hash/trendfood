# Bug: Pro/Enterprise via admin não libera nada

## Causa raiz

`src/hooks/usePlanLimits.ts` trata `pro` e `enterprise` como **vencidos** quando `trial_ends_at <= now`, e rebaixa o `effectivePlan` para `free`. O `lifetime` ignora a data, por isso é o único que "funciona" no admin.

No `ManageSubscriptionDialog` o campo de data ("Trial até") fica com o valor antigo da org (que normalmente já passou). Ao salvar Pro/Enterprise sem mexer na data, a org fica `pro/active` mas com expiração no passado → `usePlanLimits` devolve `free`.

Clientes reais via Mercado Pago não pegam isso porque o webhook (`mp-webhook`) grava `trial_ends_at` no futuro.

## Correção (frontend, escopo mínimo)

Arquivo: `src/components/admin/ManageSubscriptionDialog.tsx`

1. **Renomear o label** do campo dependendo do plano selecionado:
   - `free` → "Trial até" (atual)
   - `pro` / `enterprise` → "Assinatura vence em"
   - `lifetime` → "Data de referência (não afeta acesso)"

2. **Auto-preencher data ao trocar de plano** (`onValueChange` do Select de plano):
   - Se mudar para `pro` ou `enterprise` e a data atual estiver `null` ou no passado → setar automaticamente para `hoje + 30 dias`.
   - Se mudar para `free` → preserva como está.
   - Se `lifetime` → preserva (irrelevante).

3. **Validação no `handleSave`**:
   - Se plano final é `pro` ou `enterprise` e `trialDate` é `null` ou `<= hoje` → bloquear com `toast.error("Para Pro/Enterprise, escolha uma data de vencimento futura.")` e não salvar.

4. **Hint visual**: pequena linha de ajuda abaixo do date picker quando plano = `pro`/`enterprise`:
   > "Após esta data a loja é rebaixada para Grátis automaticamente."

## Não mexer

- `usePlanLimits.ts` — comportamento de expiração está correto e é usado em produção pelo fluxo MP.
- Webhook MP, triggers SQL, tabelas — sem mudanças.
- Lógica de Vitalício — sem mudanças.

## Validação

1. Abrir admin → org TrendFood → Gerenciar.
2. Trocar para Pro → data deve auto-pular para 13/06/2026 (hoje +30d).
3. Salvar → no dashboard da loja, recursos Pro (KDS, iFood, Robô IA, etc.) devem liberar imediatamente.
4. Repetir com Enterprise.
5. Tentar salvar Pro com data no passado → deve bloquear com toast.
