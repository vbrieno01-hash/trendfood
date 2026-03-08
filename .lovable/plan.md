

## Plano: Sistema de Precificação (Ficha Técnica + Markup Automático)

O sistema aproveitará a infraestrutura existente de `stock_items` e `menu_item_ingredients` para calcular o custo de cada item do cardápio e sugerir preço de venda com base em uma margem configurável.

---

### 1. Migração: adicionar `cost_per_unit` na tabela `stock_items`

```sql
ALTER TABLE public.stock_items ADD COLUMN cost_per_unit numeric NOT NULL DEFAULT 0;
```

Esse campo armazena o custo unitário de cada insumo (ex: R$ 12,50/kg de carne).

### 2. Atualizar `StockTab.tsx` — campo de custo no formulário de insumos

- Adicionar campo "Custo unitário (R$)" usando o componente `CurrencyInput` já existente no formulário de criar/editar insumo
- Exibir a coluna "Custo/un" na tabela de insumos

### 3. Atualizar `useStockItems.ts` — incluir `cost_per_unit`

- Adicionar `cost_per_unit` ao type `StockItem` e `StockItemInput`
- Incluir no insert/update mutations

### 4. Criar nova aba `PricingTab.tsx`

Componente principal com:

**Tabela de itens do cardápio** mostrando para cada produto:
- Nome do item
- Custo total (soma dos ingredientes × custo unitário × quantidade usada)
- Preço de venda atual
- Margem atual (%) = `(preço - custo) / preço × 100`
- Badge visual: verde (margem > 50%), amarelo (30-50%), vermelho (< 30%)
- Preço sugerido baseado no markup configurado

**Controles no topo:**
- Slider/input de markup desejado (padrão 60%, vai de 20% a 90%)
- Resumo: custo médio, margem média, itens sem ficha técnica

**Ações:**
- Botão "Aplicar preço sugerido" por item (atualiza `menu_items.price`)
- Botão "Aplicar todos" para atualizar todos de uma vez
- Itens sem ingredientes vinculados mostram aviso "Sem ficha técnica"

### 5. Registrar aba no `DashboardPage.tsx`

- Adicionar `"pricing"` ao type `TabKey`
- Adicionar no grupo "FINANCEIRO" do sidebar com ícone `Calculator`
- Vincular ao plano Enterprise (mesma lógica de `stock_ingredients`)
- Renderizar `<PricingTab>` no switch de tabs

### 6. Hooks necessários

Criar `usePricingData.ts`:
- Query que busca todos `menu_items` com seus `menu_item_ingredients` e o `cost_per_unit` de cada `stock_item` vinculado
- Calcula custo total, margem e preço sugerido para cada item
- Mutation para atualizar preço de venda (`menu_items.price`)

---

### Estrutura visual da aba

```text
┌──────────────────────────────────────────────────┐
│  💰 Precificação                                 │
│  Markup desejado: [====60%====]                   │
│                                                  │
│  Resumo: Custo médio R$ 8,50 | Margem média 62%  │
│  ⚠ 3 itens sem ficha técnica                     │
├──────────────────────────────────────────────────┤
│  Item         Custo  Preço  Margem  Sugerido     │
│  X-Burger     R$8    R$25   68% 🟢  R$20        │
│  Açaí 500ml   R$12   R$18   33% 🟡  R$30        │
│  Coca-Cola    —      R$8    —       —            │
│  [Aplicar Todos os Preços Sugeridos]              │
└──────────────────────────────────────────────────┘
```

### Plano de acesso

Feature `pricing` → disponível nos planos `enterprise` e `lifetime` (mesmo nível que `stock_ingredients`, já que depende da ficha técnica de insumos).

