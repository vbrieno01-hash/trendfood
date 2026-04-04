

## Plano: Padronizar formato de preço em todas as páginas

### Problema
A página principal (`Index.tsx`) usa `formatPrice` com 2 casas decimais (`R$ 99,00`), enquanto `/planos`, `SubscriptionTab` e `UpgradeDialog` usam sem decimais (`R$ 99`). Toda a lógica de cálculo (trimestral, anual, equivalente mensal, badges) está correta e idêntica — apenas a formatação visual difere.

### Alteração

**`src/pages/Index.tsx`** (único arquivo)
- Alterar `formatPrice` na linha 98 de `.toFixed(2).replace(".", ",")` para `.toFixed(0)` — alinhando com o padrão das outras 3 páginas

### Resultado
Todas as 4 telas de planos exibirão preços no formato `R$ 99`, `R$ 267`, `R$ 990` etc., de forma consistente.

