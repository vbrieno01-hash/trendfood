

## Plano: Dias selecionáveis por item do cardápio

### O que muda
Cada item do cardápio poderá ter dias da semana configurados (ex: "só segunda e quarta"). Quando o cliente acessa a loja, itens fora do dia ficam ocultos ou marcados como indisponíveis.

### Alterações

**1. Migração — nova coluna `available_days`**
```sql
ALTER TABLE menu_items ADD COLUMN available_days jsonb DEFAULT NULL;
-- NULL = disponível todos os dias
-- Exemplo: ["seg","qua","sex"] = só nesses dias
```

**2. `src/hooks/useMenuItems.ts`**
- Adicionar `available_days` ao tipo `MenuItem` e ao `select` da query
- Adicionar `available_days` ao `MenuItemInput`
- Incluir `available_days` no `insert` e `update`

**3. `src/components/dashboard/MenuTab.tsx`** — formulário de criação/edição
- Adicionar seção "Dias disponíveis" com 7 checkboxes (Seg–Dom)
- Toggle "Todos os dias" (quando ativo, `available_days = null`)
- Quando desativado, mostra os checkboxes dos dias
- Salvar no `form` e enviar na mutação

**4. `src/pages/UnitPage.tsx`** — filtragem no cliente
- Usar `getNowInBrasilia()` (já existe em `storeStatus.ts`) para pegar o dia atual
- No `filteredMenuItems`, esconder itens cujo `available_days` não inclui o dia atual
- Itens com `available_days === null` sempre aparecem

### Layout no dashboard

```text
┌─ Dias disponíveis ─────────────────────┐
│ ☑ Todos os dias                        │
│                                         │
│  (quando desmarcado:)                   │
│  ☐ Seg  ☐ Ter  ☑ Qua  ☐ Qui           │
│  ☐ Sex  ☑ Sáb  ☐ Dom                   │
└─────────────────────────────────────────┘
```

### Impacto
- **Lojas existentes**: `available_days` começa null → todos os itens continuam visíveis, zero impacto
- **Lojas novas**: podem configurar dias específicos por item
- **Impressão/pedidos**: sem alteração — itens que não aparecem simplesmente não são pedidos

### Arquivos alterados
- Migração SQL (1 coluna)
- `src/hooks/useMenuItems.ts` (tipo + queries)
- `src/components/dashboard/MenuTab.tsx` (formulário)
- `src/pages/UnitPage.tsx` (filtro por dia)

