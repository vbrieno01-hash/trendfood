

## Corrigir filtro de itens no Balcão

### Problema
A aba Balcão filtra apenas por `item.available`, mas ignora:
1. **`available_days`** — itens com dias específicos aparecem mesmo fora do dia configurado
2. **`paused_categories`** — categorias pausadas continuam visíveis

Isso faz a lista ficar enorme com itens que não deveriam aparecer.

### Solução
Em `src/components/dashboard/CounterTab.tsx`, atualizar o filtro `availableItems` para incluir as mesmas regras da vitrine pública (UnitPage):

1. **Filtrar por `available_days`**: usar a mesma lógica de dia da semana (fuso Brasília) já presente em `UnitPage.tsx`
2. **Filtrar por `paused_categories`**: receber a org e checar `paused_categories` para ocultar categorias pausadas

### Arquivo alterado
- `src/components/dashboard/CounterTab.tsx` — adicionar filtros de `available_days` e `paused_categories` no `useMemo` de `availableItems`

