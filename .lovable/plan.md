
# Ordenação do cardápio: mais recente em cima ou embaixo

## Resumo
Adicionar um botão/toggle no cabeçalho do cardápio para o usuário escolher a ordem de exibição dos itens dentro de cada categoria: **mais recentes primeiro** (de cima pra baixo) ou **mais antigos primeiro** (de baixo pra cima). A preferência será salva localmente no navegador.

## Como vai funcionar
- Um botão discreto ao lado do botão "Novo item" com ícone de seta (ArrowUpDown) permite alternar entre:
  - **Mais recentes primeiro** - itens adicionados por último aparecem no topo de cada categoria
  - **Mais antigos primeiro** - itens adicionados primeiro aparecem no topo (comportamento atual por nome)
- A escolha fica salva no `localStorage` para persistir entre sessões
- A ordenação se aplica dentro de cada categoria (a ordem das categorias continua a mesma)

## Mudanças técnicas

### 1. `src/hooks/useMenuItems.ts`
- Adicionar parâmetro `sortOrder` ao hook `useMenuItems` com valores `"newest"` ou `"oldest"`
- Alterar a ordenação secundária (dentro de cada categoria) de `name.localeCompare` para usar `created_at`:
  - `"newest"`: itens mais recentes primeiro (`created_at` decrescente)
  - `"oldest"`: itens mais antigos primeiro (`created_at` crescente)
- Incluir `sortOrder` na `queryKey` para reagir a mudanças

### 2. `src/components/dashboard/MenuTab.tsx`
- Adicionar estado `sortOrder` com valor inicial lido do `localStorage`
- Adicionar um botão com ícone `ArrowUpDown` ou `ArrowDownUp` no cabeçalho, ao lado do "Novo item"
- Ao clicar, alterna entre `"newest"` e `"oldest"` e salva no `localStorage`
- Passar `sortOrder` para o hook `useMenuItems`
- Texto descritivo pequeno indicando a ordem atual (ex: "Recentes primeiro" ou "Antigos primeiro")
