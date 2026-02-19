
# Busca e Filtros no Painel Admin

## O que será adicionado

Uma barra de controles completa acima do grid de lojas com:
- Campo de busca por nome ou slug da loja (tempo real, sem apertar Enter)
- Filtro rápido de status: "Todos", "Ativo", "Trial" — em formato de botões pill/tab
- Filtro de endereço: "Todos", "Com endereço", "Sem endereço" — mesmo formato
- Contador dinâmico mostrando quantas lojas estão sendo exibidas vs total
- Mensagem amigável quando nenhuma loja bate nos filtros

## Visual proposto

```text
┌─────────────────────────────────────────────────────────────┐
│  🔍 [Buscar por nome ou URL...                          ]   │
│                                                             │
│  Status:  [Todos]  [Ativo]  [Trial]                        │
│  Endereço:[Todos]  [Com endereço]  [Sem endereço]          │
│                                                     3 de 5 │
└─────────────────────────────────────────────────────────────┘
```

## Como funciona tecnicamente

A filtragem é 100% client-side — os dados já foram carregados no `orgs` array. Não há nova chamada ao banco.

Serão adicionados 3 estados novos em `AdminContent`:
```
search: string        → texto digitado na busca
statusFilter: string  → "all" | "active" | "trial"
addressFilter: string → "all" | "with" | "without"
```

A lista exibida será um `filteredOrgs` calculado via `useMemo`:
```
filteredOrgs = orgs
  .filter(org → nome ou slug contém search)
  .filter(org → subscription_status bate no statusFilter)
  .filter(org → store_address bate no addressFilter)
```

O grid passa a renderizar `filteredOrgs` em vez de `orgs`. Os KPI cards continuam usando `orgs` (total real, não filtrado).

## Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `src/pages/AdminPage.tsx` | Adicionar barra de filtros, estados de busca, `useMemo` para lista filtrada e contador dinâmico |

## Detalhes de implementação

- Importar `useMemo` do React e o ícone `Search` do lucide-react
- Importar o componente `Input` de `@/components/ui/input`
- Adicionar a barra de filtros entre o título da seção e o grid de lojas
- Os botões de filtro usarão estilo condicional: selecionado → `bg-primary text-primary-foreground`, não selecionado → `bg-muted text-muted-foreground hover:bg-muted/80`
- Quando `filteredOrgs.length === 0`, mostrar mensagem "Nenhuma loja encontrada com esses filtros" com botão para limpar filtros
- A busca é case-insensitive e normaliza acentos via `.toLowerCase()`
