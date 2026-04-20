---
name: data-preservation-on-expiration
description: Quando assinatura paga expira, dados nunca são apagados — apenas bloqueia criar novos via triggers SQL. Cupons/fidelidade existentes continuam válidos.
type: feature
---

## Política

Quando a assinatura Pro/Enterprise expira (`trial_ends_at <= now()` em plano pago), o `effectivePlan` em `usePlanLimits` vira `"free"`, mas **nenhum dado é apagado** do banco. Tudo que o lojista criou (cupons, fidelidade, bairros, adicionais, KDS, histórico) permanece intacto e reaparece automaticamente quando ele renova.

## Como o gate funciona

### 1. Frontend (UI)
- `usePlanLimits` retorna `canAccess(feature)` baseado no `effectivePlan`
- Tabs como `CouponsTab` e `LoyaltyTab` mostram `LockedFeatureBanner` quando `!canAccess` e desabilitam botões "Criar"
- `HomeTab` mostra avisos pré-expiração (3 dias) e expirado

### 2. Backend (definitivo — triggers SQL)
RPC `get_effective_plan(_org_id)` é a fonte única da verdade. Triggers `BEFORE INSERT`/`UPDATE` bloqueiam:
- `tr_gate_coupons_paid_plan` — INSERT em `coupons` se Free
- `tr_gate_loyalty_paid_plan` — INSERT/UPDATE em `loyalty_config` com `enabled=true` se Free
- `tr_gate_neighborhoods_paid_plan` — INSERT em `delivery_neighborhoods` se Free
- `tr_gate_global_addons_paid_plan` — INSERT em `global_addons` se Free
- `tr_gate_menu_item_addons_paid_plan` — INSERT em `menu_item_addons` se Free (resolve org via JOIN com menu_items)

UPDATE/DELETE permanecem permitidos para lojista "arrumar a casa". Cupons/fidelidade já criados continuam funcionando no checkout — não pune cliente final pela inadimplência do lojista.

### 3. Edge function `ai-bot-respond`
Bot WhatsApp checa `get_effective_plan(_org_id)` no início. Se `free`, retorna 200 silencioso (sem responder). Não é gate só de UI — é o coração da funcionalidade.

## O que NUNCA fazer

- Nunca DELETE em massa de dados do lojista após expiração
- Nunca esconder dados existentes (continuam visíveis em modo leitura)
- Nunca esconder cardápio do cliente final por excesso de itens (200 itens em plano Free continuam vendendo, só não pode criar o 201)
