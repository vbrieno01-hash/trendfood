

# Corrigir Realtime na aba Cozinha (KitchenTab)

## Problema

O `KitchenTab.tsx` tem uma subscription Realtime que escuta **apenas UPDATE** na tabela `orders` (linha 115). Novos pedidos (INSERT) dependem do canal separado no `DashboardPage` para invalidar o cache. Com 3 canais simultaneos escutando a mesma tabela (`useOrders`, `DashboardPage`, `KitchenTab`), ha chance de conflito ou perda de eventos, fazendo com que a tela da cozinha nao atualize ao vivo.

## Solucao

Mudar o canal do `KitchenTab` para escutar **todos** os eventos (`INSERT`, `UPDATE`, `DELETE`) em vez de apenas `UPDATE`. Isso torna a aba auto-suficiente -- nao depende mais do canal do DashboardPage para atualizar a lista de pedidos.

## Detalhe tecnico

### `src/components/dashboard/KitchenTab.tsx` (linhas 115-128)

Trocar `event: "UPDATE"` por `event: "*"` na subscription Realtime:

**Antes:**
```typescript
// Realtime: only UPDATE to refresh UI (INSERT handled by DashboardPage)
useEffect(() => {
  if (!orgId) return;
  const channel = supabase
    .channel(`kitchen-tab-update-${orgId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders", filter: `organization_id=eq.${orgId}` },
      () => {
        qc.invalidateQueries({ queryKey: ["orders", orgId, ["pending", "preparing"]] });
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [orgId, qc]);
```

**Depois:**
```typescript
// Realtime: listen for all order changes (INSERT + UPDATE + DELETE)
useEffect(() => {
  if (!orgId) return;
  const channel = supabase
    .channel(`kitchen-tab-${orgId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${orgId}` },
      () => {
        qc.invalidateQueries({ queryKey: ["orders", orgId, ["pending", "preparing"]] });
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [orgId, qc]);
```

## Arquivo alterado

- `src/components/dashboard/KitchenTab.tsx` -- escutar todos os eventos Realtime, nao apenas UPDATE

