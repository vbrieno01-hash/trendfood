

## Plano: Travas de permissão por plano de assinatura

### 1. Atualizar `usePlanLimits.ts` — adicionar novas features

Adicionar 3 novas features ao tipo `Feature` e à matriz `FEATURE_ACCESS`:
- `addons` — Pro+ (bloqueado no Free)
- `stock_ingredients` — Enterprise+ (bloqueado no Free e Pro)
- `online_payment` — Pro+ (bloqueado no Free)

### 2. Bloquear Adicionais no `MenuTab.tsx` (plano Free)

- Receber `planLimits` como prop (ou `effectivePlan`)
- Envolver `AddonsSection` e `PendingAddonsSection` com uma verificação: se `!canAccess("addons")`, exibir um card com cadeado e texto "Disponível no plano Pro" em vez da seção funcional

### 3. Bloquear Composição/Estoque no `MenuTab.tsx` (Free e Pro)

- Envolver `IngredientsSection` e `PendingIngredientsSection` com verificação: se `!canAccess("stock_ingredients")`, exibir card com cadeado "Disponível no plano Enterprise"

### 4. Bloquear aba Estoque no `DashboardPage.tsx`

- Adicionar `stock` ao `lockedFeatures` usando `!canAccess("stock_ingredients")`
- Renderizar `UpgradePrompt` quando a aba estoque estiver bloqueada

### 5. Filtrar pagamentos no `UnitPage.tsx` (cardápio do cliente)

- Importar `usePlanLimits` e chamar com `org`
- Se `!canAccess("online_payment")`, renderizar apenas as opções "Dinheiro" e "Maquininha na Entrega" no `<Select>` de pagamento
- Se Pro+, mostrar todas as opções (Dinheiro, Cartão Débito, Cartão Crédito, PIX)

### 6. Reforçar limite de 20 itens (já existe)

- O limite já funciona via `menuItemLimit` prop. Verificar que o toast e bloqueio do botão "Adicionar" estão corretos — o código atual já impede criação acima do limite.

### Arquivos afetados
- `src/hooks/usePlanLimits.ts`
- `src/components/dashboard/MenuTab.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/UnitPage.tsx`

