

## Plano: Sincronizar SubscriptionTab com a tabela `platform_plans`

### Problema
O `SubscriptionTab.tsx` usa uma constante `PLANS` hardcoded, enquanto o `PricingPage.tsx` já busca os planos da tabela `platform_plans`. Isso causa dessincronia — alterações feitas no admin ou no banco não aparecem no dashboard.

### Alterações

#### 1. `SubscriptionTab.tsx` — Buscar planos do banco
- Remover a constante `PLANS` hardcoded (linhas 27-82)
- Adicionar um `useEffect` + `useState` para buscar da tabela `platform_plans` (igual ao `PricingPage.tsx`)
- Mapear os dados do banco para o formato esperado pelo componente (usando lógica similar à função `mapPlanRow` do `PricingPage`)
- Manter o estado de loading enquanto os planos carregam

#### 2. Atualizar `platform_plans` no banco
- Atualizar o plano `free` na tabela para `price_cents = 500` (R$ 5) e description "Teste de pagamento real" para o teste atual
- Isso garante que tanto a página de preços pública quanto o dashboard mostrem o mesmo valor

### Resultado
Qualquer alteração feita via Admin nos planos será refletida automaticamente em ambas as páginas (PricingPage e SubscriptionTab).

