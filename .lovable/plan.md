
# Atualização em Tempo Real dos Cards de Estatísticas (HomeTab)

## Problema

O hook `useSuggestions` usa apenas `useQuery` simples — sem nenhuma assinatura Realtime. Isso significa que os cards "Total", "Pendentes", "Analisando" e "No Cardápio" só atualizam quando o lojista recarrega a página.

## Solução

Adicionar um `useEffect` com `supabase.channel()` dentro do `useSuggestions` para escutar todos os eventos (`INSERT`, `UPDATE`, `DELETE`) na tabela `suggestions`, filtrado pelo `organization_id`. Quando qualquer mudança ocorrer, invalida a query do React Query automaticamente — exatamente o mesmo padrão já usado no `useOrders`.

## Mudança técnica

**Arquivo:** `src/hooks/useSuggestions.ts`

Transformar o hook `useSuggestions` para também exportar o `useEffect` de Realtime:

```typescript
// Dentro de useSuggestions:
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useSuggestions = (orgId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({ ... }); // permanece igual

  // NOVO: Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`suggestions-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suggestions",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["suggestions", orgId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

  return query;
};
```

## O que muda para o usuário

- Os cards de estatísticas no HomeTab passam a atualizar **automaticamente** sempre que:
  - Um cliente enviar uma nova sugestão (Total ++)
  - O lojista aprovar uma sugestão no Mural (Pendentes → Analisando → No Cardápio)
  - Alguém votar em uma sugestão (Top 5 reordena)
  - Uma sugestão for excluída (Total --)
- Sem necessidade de recarregar a página.
- O Top 5 também se reordena em tempo real conforme os votos chegam.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/hooks/useSuggestions.ts` | Editar — adicionar `useEffect` com Realtime subscription |

Nenhum outro arquivo precisa ser alterado. O `HomeTab`, o `MuralTab` e a página pública (`UnitPage`) já consomem `useSuggestions` — todos se beneficiam automaticamente da mudança.
