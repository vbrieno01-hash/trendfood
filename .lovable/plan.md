
# Realtime não Funciona no Painel do Garçom — Diagnóstico e Correção

## Causa Raiz

Há dois problemas que juntos fazem o painel não atualizar instantaneamente:

### Problema 1 — Query Key incompatível no `invalidateQueries` do WaiterTab

O React Query identifica caches usando comparação profunda de arrays. O `useOrders` registra o cache com a query key:

```
["orders", orgId, ["ready"]]   ← array passado pelo chamador
```

Já o `WaiterTab` tem um segundo canal realtime com seu próprio `invalidateQueries` hardcoded:

```ts
qc.invalidateQueries({ queryKey: ["orders", orgId, ["ready"]] });
```

Esse segundo canal cria uma instância nova do array `["ready"]` — e como o React Query compara arrays por identidade de referência no `invalidateQueries` com match exato, na prática o cache da query pode não ser atingido corretamente dependendo da versão.

### Problema 2 — Dois canais realtime concorrentes

O `useOrders` já cria seu próprio canal realtime para `orders` com o filtro correto. O `WaiterTab` cria **outro canal separado** (`waiter-tab-${orgId}`) escutando a mesma tabela. Isso gera dois canais abertos para a mesma coisa — o que pode causar conflitos de assinatura no WebSocket e resultar em eventos sendo descartados.

### Problema 3 — `staleTime` padrão pode atrasar refetch

O React Query tem `staleTime: 0` por padrão, mas se o `invalidateQueries` não bater exatamente com a query key (problema 1), o cache não é atualizado e o dado fica parado.

---

## Solução

### `src/components/dashboard/WaiterTab.tsx`

**Remover completamente o `useEffect` de realtime duplicado** — o `useOrders` já cuida disso internamente. Isso elimina o conflito de canais e simplifica o código.

```tsx
// REMOVER este useEffect inteiro do WaiterTab:
useEffect(() => {
  if (!orgId) return;
  const channel = supabase
    .channel(`waiter-tab-${orgId}`)
    .on(...)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [orgId, qc]);
```

### `src/hooks/useOrders.ts`

**Garantir que o `invalidateQueries` dentro do `useOrders` use `exact: false`** para que qualquer query key que comece com `["orders", organizationId]` seja invalidada, independente do array de statuses:

```ts
// Antes:
qc.invalidateQueries({ queryKey: ["orders", organizationId, statuses] });

// Depois (usa prefixo, invalida todos os status):
qc.invalidateQueries({ queryKey: ["orders", organizationId] });
```

Isso garante que quando um pedido muda para `ready`, tanto o painel da cozinha (`["orders", orgId, ["pending","preparing"]]`) quanto o painel do garçom (`["orders", orgId, ["ready"]]`) são invalidados e refetchados imediatamente.

---

## Resultado Esperado

| Evento | Antes | Depois |
|---|---|---|
| Cozinha marca pedido como "Pronto" | Garçom precisa atualizar manualmente | Aparece instantaneamente no painel |
| Novo pedido chega | Pode não aparecer sem refresh | Aparece instantaneamente |
| Dois canais concorrentes | Possíveis conflitos de WebSocket | Um único canal estável por tabela |

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/hooks/useOrders.ts` | Mudar `invalidateQueries` para usar prefixo (`queryKey: ["orders", organizationId]`) |
| `src/components/dashboard/WaiterTab.tsx` | Remover o `useEffect` de realtime duplicado e imports não usados |
