
Objetivo: corrigir o checkout da promoção para que o valor promocional seja cobrado de verdade em todos os fluxos, especialmente no QR Code/PIX, sem quebrar a cobrança normal.

O que encontrei
- A promoção hoje está majoritariamente na UI.
- O fluxo de cartão recorrente já envia `promo` para `create-mp-subscription`, então o backend consegue cobrar metade no 1º mês.
- O fluxo PIX não participa disso:
  - `CardPaymentForm` abre a aba PIX sem passar `promo` nem `billing` para `PixPaymentTab`
  - `PixPaymentTab` chama `create-mp-payment` só com `org_id`, `plan`, `cpf_cnpj`, `payment_method`
  - `create-mp-payment` ignora promoção e cobra sempre `planRow.price_cents / 100`
- Isso bate com o log já existente: `create-mp-payment ... plan=pro amount=99`
- Além disso, alguns lugares ainda mostram o preço cheio dentro do checkout mesmo quando o card mostra a oferta.

Plano de correção
1. Unificar o “contexto de checkout”
- Padronizar o que entra no `CardPaymentForm`:
  - `billing`
  - `promoApplied`
  - `displayPrice`
  - `originalPrice` opcional
- O frontend só exibe isso; o backend continua sendo a fonte final do valor real.

2. Corrigir o modal de pagamento
- `src/components/checkout/CardPaymentForm.tsx`
  - Mostrar no header o valor promocional correto quando houver oferta
  - Repassar `promo` e `billing` também para `PixPaymentTab`
  - Garantir que botão/descrição não mostrem R$ 99 quando a oferta ativa for R$ 49,50

3. Corrigir o PIX promocional
- `src/components/checkout/PixPaymentTab.tsx`
  - Aceitar `promo` e `billing`
  - Exibir o texto de pagamento com o valor promocional correto
  - Enviar `promo` e `billing` para `create-mp-payment`
  - Ajustar a copy para deixar claro:
    - cartão: recorrente
    - PIX: ativa 30 dias; próxima renovação será no valor normal

4. Corrigir o backend do PIX
- `supabase/functions/create-mp-payment/index.ts`
  - Validar `promo` no backend
  - Buscar `used_first_month_promo` da organização
  - Se `promo=true`, plano pago, mensal e loja elegível: cobrar metade do valor
  - Incluir metadados no pagamento indicando promo aplicada
  - Não confiar em valor vindo do frontend
- `supabase/functions/check-subscription-pix/index.ts`
  - Ao aprovar um PIX promocional, marcar `used_first_month_promo = true`
- `supabase/functions/mp-webhook/index.ts`
  - No fluxo de pagamento avulso/PIX, respeitar os metadados da promo para também marcar a org corretamente caso a aprovação venha por webhook antes/depois do polling

5. Corrigir todos os pontos de entrada visuais
- `src/components/dashboard/UpgradeDialog.tsx`
  - Passar o preço promocional real para o `CardPaymentForm`, não só exibir no `PlanCard`
- `src/components/dashboard/SubscriptionTab.tsx`
  - Garantir que `cardFormPlan.price` seja promocional quando a oferta estiver ativa
- `src/pages/PricingPage.tsx`
  - Mesmo ajuste no `CardPaymentForm`
- Revisar os gatilhos que abrem `UpgradeDialog`:
  - banner do dashboard
  - telas bloqueadas (`UpgradePrompt`)
  - QR Code do Cardápio
  - aba Assinatura/Planos

6. Auditoria rápida de consistência
- Procurar qualquer outro uso de `CardPaymentForm` / `PixPaymentTab` para garantir que nenhum caminho ainda abra checkout com preço cheio
- Verificar também o caso “anual no PIX”, porque hoje o fluxo PIX não parece considerar billing de verdade

Detalhes técnicos
- Não precisa nova tabela nem nova migração; `used_first_month_promo` já existe.
- A validação do desconto deve continuar no backend.
- Melhor modelo:
  - frontend envia intenção: `plan`, `billing`, `promo`
  - backend recalcula:
    - preço base pelo `platform_plans`
    - elegibilidade pela organização
    - valor final seguro
- Para PIX:
```text
trial expirado + promo elegível
→ UI mostra R$ 49,50
→ PixPaymentTab envia promo=true
→ create-mp-payment recalcula 49,50 no backend
→ pagamento aprovado
→ check-subscription-pix/mp-webhook marca used_first_month_promo=true
→ próxima renovação PIX/manual já sai no valor normal
```

Arquivos a ajustar
- `src/components/checkout/CardPaymentForm.tsx`
- `src/components/checkout/PixPaymentTab.tsx`
- `src/components/dashboard/UpgradeDialog.tsx`
- `src/components/dashboard/SubscriptionTab.tsx`
- `src/pages/PricingPage.tsx`
- `supabase/functions/create-mp-payment/index.ts`
- `supabase/functions/check-subscription-pix/index.ts`
- `supabase/functions/mp-webhook/index.ts`

Checklist de validação depois da implementação
- Banner do dashboard → “Aproveitar oferta” → cartão cobra metade
- Banner do dashboard → “Aproveitar oferta” → PIX gera QR com metade
- Aba Assinatura → cartão e PIX com metade
- Tela bloqueada de feature → cartão e PIX com metade
- QR Code do Cardápio → cartão e PIX com metade
- Depois de usar a oferta uma vez, tudo volta a mostrar/cobrar preço normal
- Nenhum fluxo elegível mostra R$ 99 enquanto a oferta estiver ativa
