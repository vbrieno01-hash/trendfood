

## Plano: Limpar entregas antigas automaticamente ao reabrir a loja

### Problema
Entregas com status "pendente" de dias anteriores ficam visíveis para os motoboys, poluindo a lista e permitindo que aceitem corridas de pedidos antigos.

### Solução (duas camadas)

**1. Filtro imediato no hook do motoboy** (`src/hooks/useCourier.ts`)

Em `useAvailableDeliveries`, adicionar filtro `.gte("created_at", todayStart)` para que apenas entregas criadas **hoje** apareçam. Isso resolve instantaneamente o problema visual.

```typescript
// Calcula início do dia em Brasília (GMT-3)
const now = new Date();
const brasiliaOffset = now.getTime() + now.getTimezoneOffset() * 60000 + (-3) * 3600000;
const todayBrasilia = new Date(brasiliaOffset);
todayBrasilia.setHours(0, 0, 0, 0);
// Converter de volta para UTC para a query
const todayStartUTC = new Date(todayBrasilia.getTime() + 3 * 3600000).toISOString();

// Na query:
.gte("created_at", todayStartUTC)
```

**2. Limpeza automática de entregas pendentes antigas** (`src/hooks/useCourier.ts`)

Adicionar um hook `useCleanupStaleDeliveries(organizationId)` que, ao montar a página do motoboy ou do dashboard de entregas, cancela automaticamente todas as entregas `pendente` criadas antes de hoje:

```typescript
export function useCleanupStaleDeliveries(organizationId: string | undefined) {
  useEffect(() => {
    if (!organizationId) return;
    // Cancela entregas pendentes de dias anteriores
    supabase.from("deliveries")
      .update({ status: "cancelada" })
      .eq("organization_id", organizationId)
      .eq("status", "pendente")
      .lt("created_at", todayStartUTC);
  }, [organizationId]);
}
```

**3. Chamar o cleanup** em `CourierPage.tsx` e `CourierDashboardTab.tsx` ao montar.

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useCourier.ts` | Filtro `.gte` em `useAvailableDeliveries` + novo hook `useCleanupStaleDeliveries` |
| `src/pages/CourierPage.tsx` | Chamar `useCleanupStaleDeliveries` |
| `src/components/dashboard/CourierDashboardTab.tsx` | Chamar `useCleanupStaleDeliveries` |

