

# Correção dos 2 bugs de redirecionamento

## 1. `src/pages/PricingPage.tsx` (linha 139)
Trocar `tab=assinatura` por `tab=subscription`:
```typescript
navigate(`/dashboard?tab=subscription&plan=${selectedPlan.key}`, { replace: true });
```

## 2. `src/components/dashboard/SubscriptionTab.tsx`
Adicionar leitura do parâmetro `plan` da URL no início do componente:
```typescript
import { useSearchParams } from "react-router-dom";

// Dentro do componente:
const [searchParams, setSearchParams] = useSearchParams();

useEffect(() => {
  const planFromUrl = searchParams.get("plan");
  if (planFromUrl && PLANS.some(p => p.key === planFromUrl && p.key !== "free")) {
    setSelectedPlan(planFromUrl);
    // Limpar o param da URL
    searchParams.delete("plan");
    setSearchParams(searchParams, { replace: true });
  }
}, []);
```

Isso faz com que, ao chegar na aba com `?plan=pro`, o checkout do Mercado Pago já abra automaticamente no plano correto.

