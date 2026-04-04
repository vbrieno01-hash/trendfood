

## Plano: Padronizar formatação de preços e sufixos em todas as 4 páginas

### Inconsistências encontradas

1. **Sufixo trimestral**: `Index.tsx` usa `/trim`, as outras 3 usam `/tri`
2. **Equivalente mensal**: `Index.tsx` usa `.toFixed(0)` (sem decimais, ex: `R$ 82/mês`), enquanto `PricingPage`, `SubscriptionTab` e `UpgradeDialog` usam `.toFixed(2)` (ex: `R$ 82,50/mês`)
3. **Preço mensal no UpgradeDialog**: usa `formatPriceFull` (com decimais, `R$ 99,00`) enquanto as outras 3 usam `formatPrice` (sem decimais, `R$ 99`)
4. **Promo price no SubscriptionTab**: usa `formatPrice` (sem decimais) enquanto `PricingPage` e `UpgradeDialog` usam `.toFixed(2)` com decimais

### Decisão de padronização

Usar o formato **com 2 casas decimais** para subtítulos (equivalente mensal) e promos, e **sem decimais** para preços principais — alinhando tudo ao padrão mais usado.

- Preço principal: `R$ 99` (sem decimais) — já está assim em 3 de 4 páginas
- Equivalente mensal: `R$ 82,50/mês` (com decimais) — mais preciso
- Promo: `R$ 49,50` (com decimais) — mais preciso
- Sufixo trimestral: `/tri` — usado em 3 de 4 páginas

### Alterações

**1. `src/pages/Index.tsx`** (2 correções)
- Linha 384: trocar `/trim` por `/tri`
- Linhas 386-388: trocar `.toFixed(0)` por `.toFixed(2).replace(".", ",")` nos subtítulos de equivalente mensal

**2. `src/components/dashboard/UpgradeDialog.tsx`** (1 correção)
- Linha 143: trocar `formatPriceFull(plan.price_cents)` por `formatPrice(plan.price_cents)` no `displayPrice` mensal — alinhando com as outras páginas

**3. `src/components/dashboard/SubscriptionTab.tsx`** (1 correção)
- Linha 409: trocar `formatPrice(Math.round(plan.priceCents / 2))` por formato com decimais: `` `R$ ${(Math.round(plan.priceCents / 2) / 100).toFixed(2).replace(".", ",")}` `` — alinhando promo com PricingPage e UpgradeDialog

### Resultado
Todas as 4 telas terão formato idêntico: preço principal sem decimais (`R$ 99`), sufixo `/tri`, equivalente mensal com decimais (`R$ 82,50/mês`), e promo com decimais (`R$ 49,50`).

